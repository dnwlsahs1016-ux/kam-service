const Database = require('better-sqlite3');
const db = new Database('../local.db');
const rows = db.prepare(`
  SELECT co.corp_name, COUNT(DISTINCT ri.id) raw_cnt, COUNT(DISTINCT ki.id) item_cnt
  FROM companies co
  JOIN kam_filings f ON f.corp_code = co.corp_code
  JOIN kam_raw_items ri ON ri.filing_id = f.id
  LEFT JOIN kam_items ki ON ki.raw_item_id = ri.id
  WHERE co.industry_code = '64121'
  GROUP BY co.corp_code
  ORDER BY co.corp_name
`).all();
rows.forEach(r => console.log(r.corp_name, 'raw:', r.raw_cnt, 'classified_items:', r.item_cnt));

const total = db.prepare('SELECT COUNT(*) c FROM kam_raw_items').get();
const done = db.prepare('SELECT COUNT(DISTINCT raw_item_id) c FROM kam_items').get();
console.log('전체 분류 진행:', done.c, '/', total.c);
