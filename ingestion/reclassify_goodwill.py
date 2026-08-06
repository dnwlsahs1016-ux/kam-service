"""'유형·무형자산 손상'으로 분류된 항목 중 영업권 관련 건을 '영업권 손상'으로 재분류한다.
Claude API를 다시 호출하지 않고 제목/요약에 '영업권'이 포함되는지로 판단한다.
"""

import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

DB_PATH = Path(__file__).resolve().parent.parent / "local.db"

conn = sqlite3.connect(DB_PATH)
rows = conn.execute(
    "SELECT id, title, summary FROM kam_items WHERE category = '유형·무형자산 손상'"
).fetchall()

moved = 0
for item_id, title, summary in rows:
    if "영업권" in title or "영업권" in summary:
        conn.execute("UPDATE kam_items SET category = '영업권 손상' WHERE id = ?", (item_id,))
        moved += 1

conn.commit()
conn.close()
print(f"'유형·무형자산 손상' {len(rows)}건 중 {moved}건을 '영업권 손상'으로 재분류")
