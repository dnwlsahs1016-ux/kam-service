"""기존 kam_filings의 source_url을 dcmNo 포함 버전으로 백필한다 (감사보고서 자동선택)."""

import sqlite3
import sys
import time
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, str(Path(__file__).resolve().parent))

import dart_client

DB_PATH = Path(__file__).resolve().parent.parent / "local.db"

conn = sqlite3.connect(DB_PATH)
rows = conn.execute("SELECT id, rcept_no FROM kam_filings").fetchall()
print(f"백필 대상 {len(rows)}건")

for i, (filing_id, rcept_no) in enumerate(rows, 1):
    url = dart_client.get_viewer_url(rcept_no)
    conn.execute("UPDATE kam_filings SET source_url = ? WHERE id = ?", (url, filing_id))
    if i % 20 == 0:
        conn.commit()
        print(f"{i}/{len(rows)}")
    time.sleep(0.15)

conn.commit()
conn.close()
print("완료")
