"""'총계약원가' 관련 KAM 항목이 같은 내용인데도 '기타'와 '수익인식'으로 일관성 없이
갈려있던 문제를 바로잡는다. 내용을 확인한 결과 전부 진행기준(투입법) 수익인식의 핵심
입력값인 총계약원가 추정 불확실성을 다루고 있어 '수익인식'이 맞다 - API 재호출 없이
키워드로 '기타' 항목만 '수익인식'으로 옮긴다.
"""

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "local.db"

conn = sqlite3.connect(DB_PATH)
rows = conn.execute(
    "SELECT id, title FROM kam_items WHERE category = '기타' AND title LIKE '%총계약원가%'"
).fetchall()
print(f"이동 대상 {len(rows)}건")
for item_id, title in rows:
    print(" -", item_id, title)

conn.execute(
    "UPDATE kam_items SET category = '수익인식' WHERE category = '기타' AND title LIKE '%총계약원가%'"
)
conn.commit()
conn.close()
print("완료")
