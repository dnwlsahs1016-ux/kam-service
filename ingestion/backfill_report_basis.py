"""kam_filings.report_basis를 채운다. LLM 호출 없이 raw_text 도입부 문구로 판별한다 -
핵심감사사항 섹션은 항상 "핵심감사사항은 ... 당기 (연결)재무제표 감사에서 가장 유의적인
사항입니다"로 시작하므로, 그 도입부만 보면 연결/별도를 확정할 수 있다(실제 DART 원문
표본 확인 완료).
"""
import re
import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

DB_PATH = Path(__file__).resolve().parent.parent / "local.db"

def classify(raw_text: str) -> str | None:
    # 원문에 줄바꿈/공백이 단어 중간에 섞여 들어오는 경우가 있어("재무 제표", "당기\n연결\n재무
    # 제표") 공백을 다 지우고 통짜 문자열로 비교한다. "연결무제표" 같은 OCR성 오탈자 케이스는
    # 바로 다음 문장의 "연결재무제표 전체에 대한 감사"로 보정된다(비교 범위를 400자로 확대).
    window = re.sub(r"\s+", "", raw_text[:400])
    if "연결재무제표" in window or "연결회사" in window:
        return "연결"
    if "재무제표" in window:
        return "별도"
    return None


def main():
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute(
        """SELECT kf.id, kri.raw_text
           FROM kam_filings kf
           JOIN kam_raw_items kri ON kri.filing_id = kf.id
           WHERE kf.report_basis IS NULL"""
    ).fetchall()

    counts = {"연결": 0, "별도": 0, None: 0}
    unknown_ids = []
    for filing_id, raw_text in rows:
        basis = classify(raw_text)
        counts[basis] += 1
        if basis is None:
            unknown_ids.append(filing_id)
            continue
        conn.execute("UPDATE kam_filings SET report_basis = ? WHERE id = ?", (basis, filing_id))
    conn.commit()
    conn.close()

    print(f"연결: {counts['연결']}건, 별도: {counts['별도']}건, 미확인: {counts[None]}건")
    if unknown_ids:
        print("미확인 filing_id:", unknown_ids[:20])


if __name__ == "__main__":
    main()
