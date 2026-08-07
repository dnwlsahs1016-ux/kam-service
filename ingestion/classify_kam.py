"""kam_raw_items(감사보고서에서 추출한 KAM 섹션 원문 블록)을 Claude API로:
1) 개별 KAM 항목으로 분리
2) taxonomy 카테고리로 분류
3) 요약과 감사절차 체크리스트로 정리
4) 관련 회계감사기준서(ksa_code) 태깅

기준서 "문단번호"까지는 LLM이 직접 고르게 하지 않는다 - 존재하지 않는 문단을 인용(환각)할
위험이 있기 때문에, LLM은 어떤 기준서가 관련있는지(ksa_code)까지만 판단하고, 실제로 인용할
문단은 그 기준서의 실제 문단 중 카테고리/요약 키워드와 겹치는 것을 코드로 검색해서 고른다.
이렇게 하면 인용된 (ksa_code, para_no)는 항상 standards 테이블에 실제로 존재하는 문단이다.
"""

import json
import re
import sqlite3
import sys
from pathlib import Path

from anthropic import Anthropic
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding="utf-8")
load_dotenv(Path(__file__).resolve().parent.parent / ".env.local")

DB_PATH = Path(__file__).resolve().parent.parent / "local.db"
MODEL = "claude-sonnet-5"

TAXONOMY = [
    "재고자산평가",
    "수익인식",
    "총계약원가 추정",
    "매출채권 회수가능성",
    "영업권 손상",
    "유형·무형자산 손상",
    "충당부채·우발부채",
    "계속기업 가정",
    "특수관계자 거래",
    "금융상품 공정가치평가",
    "관계기업·종속기업 지분가치평가",
    "기타",
]

SYSTEM_PROMPT = f"""당신은 신입회계사에게 감사 절차를 가르치는 시니어 회계사입니다.
아래는 실제 상장사 감사보고서에서 추출한 "핵심감사사항(KAM)" 섹션 원문입니다. 이 안에는
보통 1~3개의 개별 핵심감사사항이 포함되어 있습니다. 각 항목을 분리해서 다음 JSON 스키마의
배열로만 응답하세요. 다른 설명 문장은 출력하지 마세요.

[
  {{
    "title": "해당 핵심감사사항의 제목 (원문 그대로)",
    "category": "다음 중 하나: {", ".join(TAXONOMY)}",
    "summary": "신입회계사가 이해할 수 있도록 이 핵심감사사항이 왜 유의적인지 2~3문장으로 요약",
    "procedures": ["원문에 나온 감사절차를 항목별로 정리한 문자열 배열 (원문에 있는 내용만, 지어내지 말 것)"],
    "standard_codes": ["관련된 회계감사기준서 번호만 문자열로. 예: '540', '315'. 확신 없으면 빈 배열"]
  }}
]
"""


def call_claude(client: Anthropic, raw_text: str) -> list[dict]:
    resp = client.messages.create(
        model=MODEL,
        max_tokens=4000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": raw_text}],
    )
    text = "".join(b.text for b in resp.content if b.type == "text")
    text = re.sub(r"^```json\s*|\s*```$", "", text.strip(), flags=re.M)
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        print("  [경고] JSON 파싱 실패, 원본 응답 일부:", text[:200])
        return []
    if isinstance(data, dict):
        data = [data]  # Claude가 배열 대신 단일 객체로 응답한 경우 정규화
    if not isinstance(data, list):
        print("  [경고] 예상치 못한 응답 형태:", type(data))
        return []
    return [it for it in data if isinstance(it, dict)]


# 문단 단위 자동 매칭은 시도하지 않는다. KSA 315/330처럼 범용 위험평가 기준서는
# "수익인식", "재고자산" 같은 주제어를 본문에 쓰지 않아서 키워드 매칭으로는 관련 없는
# 문단이 뽑히거나("문단 1"로 고정) 흔한 단어("위험", "평가")로 우연히 매칭되는 오탐이
# 발생한다. 대신 기준서 단위로만 인용하고(예: "감사기준서 315"), 문단 원문이 궁금하면
# /standards/[ksaCode] 전문 페이지에서 직접 찾아보게 한다.


def main(corp_codes: list[str] | None = None):
    """corp_codes를 넘기면 해당 기업들의 미분류 raw_item만 처리한다 (예: 특정 업종 상위
    시총 기업만 분류하고 나머지는 건너뛰고 싶을 때). 생략하면 기존과 동일하게 DB 전체의
    미분류 raw_item을 처리한다."""
    client = Anthropic()  # ANTHROPIC_API_KEY 환경변수 사용
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        """CREATE TABLE IF NOT EXISTS kam_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            raw_item_id INTEGER NOT NULL REFERENCES kam_raw_items(id),
            title TEXT NOT NULL,
            category TEXT NOT NULL,
            summary TEXT NOT NULL,
            procedures_json TEXT NOT NULL,
            standard_refs_json TEXT NOT NULL,
            confidence REAL
        )"""
    )

    known_codes = {r[0] for r in conn.execute("SELECT DISTINCT ksa_code FROM standards").fetchall()}

    already_done = {r[0] for r in conn.execute("SELECT DISTINCT raw_item_id FROM kam_items").fetchall()}
    if corp_codes:
        placeholders = ",".join("?" for _ in corp_codes)
        raw_rows = conn.execute(
            f"""SELECT kri.id, kri.raw_text FROM kam_raw_items kri
                JOIN kam_filings kf ON kf.id = kri.filing_id
                WHERE kf.corp_code IN ({placeholders})""",
            corp_codes,
        ).fetchall()
    else:
        raw_rows = conn.execute("SELECT id, raw_text FROM kam_raw_items").fetchall()

    total_items = 0
    for raw_id, raw_text in raw_rows:
        if raw_id in already_done:
            continue
        try:
            items = call_claude(client, raw_text)
        except Exception as e:
            print(f"  [오류] raw_item {raw_id} 호출 실패, 건너뜀: {e}")
            continue
        for it in items:
            title = (it.get("title") or "").strip() or "(제목 없음)"
            category = it.get("category") if it.get("category") in TAXONOMY else "기타"
            summary = it.get("summary", "").strip()
            procedures = [p for p in it.get("procedures", []) if isinstance(p, str) and p.strip()]

            refs = [
                {"ksaCode": str(code).strip()}
                for code in it.get("standard_codes", [])
                if str(code).strip() in known_codes
            ]

            conn.execute(
                """INSERT INTO kam_items (raw_item_id, title, category, summary, procedures_json, standard_refs_json, confidence)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (raw_id, title, category, summary, json.dumps(procedures, ensure_ascii=False), json.dumps(refs, ensure_ascii=False), None),
            )
            total_items += 1
        conn.commit()
        print(f"raw_item {raw_id}: {len(items)}개 KAM 항목 분류 완료")

    conn.close()
    print(f"완료: 총 {total_items}개 KAM 항목 분류")


if __name__ == "__main__":
    main()
