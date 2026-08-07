"""kam_filings.source_url 중 dcmNo가 없는(=연결감사보고서/감사보고서 첨부를 못 찾고
기본 URL로 폴백된) 건을 다시 조회한다. DART 서버가 간헐적으로 응답을 실패해 폴백된
것으로 보이는데, 재조회하면 대부분 정상적으로 dcmNo를 찾는다(무료, DART API 호출만).
"""
import sqlite3
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.stdout.reconfigure(encoding="utf-8")

import dart_client

DB_PATH = Path(__file__).resolve().parent.parent / "local.db"
# 첫 실행에서 0.15초 간격으로 564건을 몰아치니 DART가 연결을 끊기 시작했다(레이트 리밋으로
# 추정) - 재시도는 훨씬 느리게(2초 간격) 돈다.
SLEEP_SEC = 2.0


def main():
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute(
        "SELECT id, rcept_no FROM kam_filings WHERE source_url IS NOT NULL AND source_url NOT LIKE '%dcmNo%'"
    ).fetchall()
    print(f"대상: {len(rows)}건")

    fixed = 0
    for filing_id, rcept_no in rows:
        try:
            url = dart_client.get_viewer_url(rcept_no)
        except Exception as e:
            print(f"[오류] {rcept_no}: {e}")
            continue
        time.sleep(SLEEP_SEC)
        if "dcmNo" in url:
            conn.execute("UPDATE kam_filings SET source_url = ? WHERE id = ?", (url, filing_id))
            conn.commit()
            fixed += 1

    conn.close()
    print(f"완료: {fixed}/{len(rows)}건 dcmNo 확보")


if __name__ == "__main__":
    main()
