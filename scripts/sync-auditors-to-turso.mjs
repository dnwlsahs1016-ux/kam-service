// company_auditors 테이블을 로컬 SQLite에서 Turso로 복사한다.
// 사전 조건: npm run db:push로 Turso 쪽에 company_auditors 빈 테이블이 이미 만들어져 있어야 한다.
// 실행: node scripts/sync-auditors-to-turso.mjs
import Database from "better-sqlite3";
import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".env.local") });

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;
if (!TURSO_URL || !TURSO_TOKEN) {
  console.error("TURSO_DATABASE_URL / TURSO_AUTH_TOKEN이 .env.local에 없습니다.");
  process.exit(1);
}

const local = new Database(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "local.db"));
const turso = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

const rows = local
  .prepare("SELECT corp_code, bsns_year, reprt_code, adtor_name, category FROM company_auditors")
  .all();

let inserted = 0;
let updated = 0;
for (const r of rows) {
  const existing = await turso.execute({
    sql: "SELECT corp_code FROM company_auditors WHERE corp_code = ?",
    args: [r.corp_code],
  });
  if (existing.rows.length === 0) {
    await turso.execute({
      sql: "INSERT INTO company_auditors (corp_code, bsns_year, reprt_code, adtor_name, category) VALUES (?, ?, ?, ?, ?)",
      args: [r.corp_code, r.bsns_year, r.reprt_code, r.adtor_name, r.category],
    });
    inserted++;
  } else {
    await turso.execute({
      sql: "UPDATE company_auditors SET bsns_year=?, reprt_code=?, adtor_name=?, category=? WHERE corp_code=?",
      args: [r.bsns_year, r.reprt_code, r.adtor_name, r.category, r.corp_code],
    });
    updated++;
  }
}

console.log(`company_auditors: ${inserted}건 삽입, ${updated}건 갱신 (총 ${rows.length}건)`);
local.close();
