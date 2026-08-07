"""KAM 데이터가 있는 회사(kam_filings 기준)를 대상으로, 2026년 1분기보고서(reprt_code
11013)에 공시된 현재 감사인을 DART에서 조회해 company_auditors에 적재한다.

1분기보고서를 쓰는 이유: 2026년 반기보고서(11012)는 제출기한(결산일+45일)이 아직 지나지
않아 데이터가 없는 회사가 많다 - 1분기보고서는 이미 다 제출된, 가장 최신의 확정 정보다.

실행: python ingestion/ingest_auditors.py
"""

import sqlite3
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import dart_client as dc

DB_PATH = Path(__file__).resolve().parent.parent / "local.db"
BSNS_YEAR = "2026"
REPRT_CODE = "11013"

BIG4_KEYWORDS = ["삼일", "삼정", "안진", "한영"]


def categorize(adtor_name: str) -> str:
    for key in BIG4_KEYWORDS:
        if key in adtor_name:
            return key
    return "기타"


def main():
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        """CREATE TABLE IF NOT EXISTS company_auditors (
            corp_code TEXT PRIMARY KEY REFERENCES companies(corp_code),
            bsns_year TEXT NOT NULL,
            reprt_code TEXT NOT NULL,
            adtor_name TEXT NOT NULL,
            category TEXT NOT NULL
        )"""
    )
    conn.commit()

    corp_codes = [
        row[0]
        for row in conn.execute("SELECT DISTINCT corp_code FROM kam_filings").fetchall()
    ]
    print(f"대상 {len(corp_codes)}개 회사")

    ok, no_data, errors = 0, 0, 0
    for i, corp_code in enumerate(corp_codes, 1):
        try:
            data = dc.get_auditor_opinion(corp_code, BSNS_YEAR, REPRT_CODE)
        except Exception as e:
            print(f"[{i}/{len(corp_codes)}] {corp_code}: ERROR {e}")
            errors += 1
            time.sleep(0.2)
            continue

        if data.get("status") != "000":
            no_data += 1
            time.sleep(0.15)
            continue

        item = data["list"][0]
        adtor = (item.get("adtor") or "").strip()
        if not adtor or adtor == "-":
            no_data += 1
            time.sleep(0.15)
            continue

        category = categorize(adtor)
        conn.execute(
            """INSERT INTO company_auditors (corp_code, bsns_year, reprt_code, adtor_name, category)
               VALUES (?, ?, ?, ?, ?)
               ON CONFLICT(corp_code) DO UPDATE SET
                 bsns_year=excluded.bsns_year, reprt_code=excluded.reprt_code,
                 adtor_name=excluded.adtor_name, category=excluded.category""",
            (corp_code, BSNS_YEAR, REPRT_CODE, adtor, category),
        )
        ok += 1
        if i % 50 == 0:
            conn.commit()
            print(f"[{i}/{len(corp_codes)}] 진행 중... (성공 {ok}, 데이터없음 {no_data}, 에러 {errors})")
        time.sleep(0.15)

    conn.commit()
    print(f"완료: 성공 {ok}, 데이터없음 {no_data}, 에러 {errors}")

    print("\n분류별 집계:")
    for row in conn.execute(
        "SELECT category, COUNT(*) FROM company_auditors GROUP BY category ORDER BY CASE category WHEN '삼일' THEN 1 WHEN '삼정' THEN 2 WHEN '안진' THEN 3 WHEN '한영' THEN 4 ELSE 5 END"
    ):
        print(f"  {row[0]}: {row[1]}개사")

    conn.close()


if __name__ == "__main__":
    main()
