"""기존 kam_items의 standard_refs_json에서 부정확한 paraNo(문단 단위 매칭)를 제거하고
{ksaCode}만 남긴다. 근거는 classify_kam.py 상단 주석 참고 - KSA 315/330 같은 범용
기준서는 키워드 매칭으로 관련 없는 문단이 뽑히거나 우연히 오탐되기 때문에, 문단 단위
인용은 포기하고 기준서 단위로만 인용한다. Claude API를 다시 호출하지 않는다.
"""

import json
import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

DB_PATH = Path(__file__).resolve().parent.parent / "local.db"

conn = sqlite3.connect(DB_PATH)
rows = conn.execute("SELECT id, standard_refs_json FROM kam_items").fetchall()

updated = 0
for item_id, refs_json in rows:
    refs = json.loads(refs_json)
    if not refs:
        continue
    stripped = [{"ksaCode": r["ksaCode"]} for r in refs]
    conn.execute(
        "UPDATE kam_items SET standard_refs_json = ? WHERE id = ?",
        (json.dumps(stripped, ensure_ascii=False), item_id),
    )
    updated += 1

conn.commit()
conn.close()
print(f"업데이트된 kam_items: {updated}")
