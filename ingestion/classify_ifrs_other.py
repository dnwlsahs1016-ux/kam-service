"""'기타' 카테고리로 분류된 kam_items는 케이스마다 실제 관련 회계기준서가 제각각이라
(리스, 법인세, 종업원급여, 건설계약 등) 카테고리 단위 고정 매핑으로는 부정확하다.
이 스크립트는 '기타' 항목 각각에 대해 Claude로 가장 관련성 높은 K-IFRS 기준서 번호를
직접 골라 kam_items.ifrs_refs_json에 저장한다.

인용 환각을 막기 위해, Claude에게는 실제 존재하는 K-IFRS 번호 목록만 보여주고 그 안에서만
고르게 하며, 응답도 그 목록에 속한 코드만 저장한다(standards 테이블 검증과 동일한 원칙).
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

# src/lib/ifrsStandards.ts의 STANDARD_TITLES와 동일한 목록을 유지한다.
STANDARD_TITLES = {
    "1001": "재무제표 표시", "1002": "재고자산", "1007": "현금흐름표",
    "1008": "회계정책, 회계추정치 변경과 오류", "1010": "보고기간후사건", "1012": "법인세",
    "1016": "유형자산", "1019": "종업원급여", "1020": "정부보조금의 회계처리와 정부지원의 공시",
    "1021": "환율변동효과", "1023": "차입원가", "1024": "특수관계자 공시",
    "1026": "퇴직급여제도에 의한 회계처리와 보고", "1027": "별도재무제표",
    "1028": "관계기업과 공동기업에 대한 투자", "1029": "초인플레이션 경제에서의 재무보고",
    "1032": "금융상품: 표시", "1033": "주당이익", "1034": "중간재무보고", "1036": "자산손상",
    "1037": "충당부채, 우발부채 및 우발자산", "1038": "무형자산", "1040": "투자부동산",
    "1041": "농림어업", "1101": "한국채택국제회계기준의 최초채택", "1102": "주식기준보상",
    "1103": "사업결합", "1104": "보험계약", "1105": "매각예정비유동자산과 중단영업",
    "1106": "광물자원의 탐사와 평가", "1107": "금융상품: 공시", "1108": "영업부문",
    "1109": "금융상품", "1110": "연결재무제표", "1111": "공동약정",
    "1112": "타 기업에 대한 지분의 공시", "1113": "공정가치측정",
    "1115": "고객과의 계약에서 생기는 수익", "1116": "리스", "1117": "보험계약",
    "1118": "재무제표 표시와 공시",
}

STANDARD_LIST_TEXT = "\n".join(f"{code} - {title}" for code, title in sorted(STANDARD_TITLES.items()))

SYSTEM_PROMPT = f"""당신은 회계감사 전문가입니다. 아래는 실제 상장사 감사보고서에 실린
핵심감사사항(KAM) 하나의 제목/요약/감사절차입니다. 이 내용과 가장 관련이 깊은 한국채택국제회계기준
(K-IFRS) 기준서를 최대 2개까지 고르세요.

반드시 아래 목록에 있는 번호만 사용하세요. 목록에 없는 번호는 지어내지 마세요. 확실히 관련된
기준서가 없으면 빈 배열을 반환하세요.

[K-IFRS 기준서 목록]
{STANDARD_LIST_TEXT}

다음 JSON 형식으로만 응답하세요. 다른 설명은 출력하지 마세요.
{{"codes": ["1012"]}}
"""


def call_claude(client: Anthropic, title: str, summary: str, procedures: list[str]) -> list[str]:
    user_content = f"제목: {title}\n요약: {summary}\n감사절차: {'; '.join(procedures)}"
    resp = client.messages.create(
        model=MODEL,
        max_tokens=200,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_content}],
    )
    text = "".join(b.text for b in resp.content if b.type == "text")
    text = re.sub(r"^```json\s*|\s*```$", "", text.strip(), flags=re.M)
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        print("  [경고] JSON 파싱 실패:", text[:200])
        return []
    codes = data.get("codes", [])
    return [c for c in codes if isinstance(c, str) and c in STANDARD_TITLES][:2]


def main():
    client = Anthropic()
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute(
        "SELECT id, title, summary, procedures_json FROM kam_items WHERE category = '기타' AND ifrs_refs_json IS NULL"
    ).fetchall()
    print(f"대상 {len(rows)}건")

    for item_id, title, summary, procedures_json in rows:
        procedures = json.loads(procedures_json)
        try:
            codes = call_claude(client, title, summary, procedures)
        except Exception as e:
            print(f"  [오류] item {item_id} 호출 실패, 건너뜀: {e}")
            continue
        conn.execute(
            "UPDATE kam_items SET ifrs_refs_json = ? WHERE id = ?",
            (json.dumps(codes, ensure_ascii=False), item_id),
        )
        conn.commit()
        print(f"item {item_id} ({title}): {codes}")

    conn.close()
    print("완료")


if __name__ == "__main__":
    main()
