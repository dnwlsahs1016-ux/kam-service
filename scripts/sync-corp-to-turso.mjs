// 특정 corp_code의 kam_filings/kam_raw_items/kam_items만 로컬 SQLite에서 Turso로 복사한다
// (신규 기업 하나를 파일럿 확대 없이 추가할 때, migrate-to-turso.mjs 전체 재실행 대신 사용).
// 실행: node scripts/sync-corp-to-turso.mjs <corp_code>
import Database from "better-sqlite3";
import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".env.local") });

const corpCode = process.argv[2];
if (!corpCode) {
  console.error("사용법: node scripts/sync-corp-to-turso.mjs <corp_code>");
  process.exit(1);
}

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;
if (!TURSO_URL || !TURSO_TOKEN) {
  console.error("TURSO_DATABASE_URL / TURSO_AUTH_TOKEN이 .env.local에 없습니다.");
  process.exit(1);
}

const local = new Database(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "local.db"));
const turso = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

// companies row는 이미 Turso에 있는지 확인만 하고, 없으면 upsert
const company = local.prepare("SELECT corp_code, corp_name, stock_code, industry_code, industry_name FROM companies WHERE corp_code = ?").get(corpCode);
if (company) {
  const existing = await turso.execute({ sql: "SELECT corp_code FROM companies WHERE corp_code = ?", args: [corpCode] });
  if (existing.rows.length === 0) {
    await turso.execute({
      sql: "INSERT INTO companies (corp_code, corp_name, stock_code, industry_code, industry_name) VALUES (?, ?, ?, ?, ?)",
      args: [company.corp_code, company.corp_name, company.stock_code, company.industry_code, company.industry_name ?? null],
    });
    console.log("companies: 신규 삽입", company.corp_name);
  } else {
    console.log("companies: 이미 존재함", company.corp_name);
  }
}

const filings = local.prepare("SELECT id, corp_code, fiscal_year, rcept_no, filed_date, source_url FROM kam_filings WHERE corp_code = ?").all(corpCode);
let filingCount = 0;
for (const f of filings) {
  const existing = await turso.execute({ sql: "SELECT id FROM kam_filings WHERE id = ?", args: [f.id] });
  if (existing.rows.length > 0) continue;
  await turso.execute({
    sql: "INSERT INTO kam_filings (id, corp_code, fiscal_year, rcept_no, filed_date, source_url) VALUES (?, ?, ?, ?, ?, ?)",
    args: [f.id, f.corp_code, f.fiscal_year, f.rcept_no, f.filed_date, f.source_url],
  });
  filingCount++;
}
console.log(`kam_filings: ${filingCount}건 삽입`);

const filingIds = filings.map((f) => f.id);
let rawCount = 0;
let itemCount = 0;
for (const filingId of filingIds) {
  const rawItems = local.prepare("SELECT id, filing_id, seq, title, raw_text FROM kam_raw_items WHERE filing_id = ?").all(filingId);
  for (const r of rawItems) {
    const existing = await turso.execute({ sql: "SELECT id FROM kam_raw_items WHERE id = ?", args: [r.id] });
    if (existing.rows.length === 0) {
      await turso.execute({
        sql: "INSERT INTO kam_raw_items (id, filing_id, seq, title, raw_text) VALUES (?, ?, ?, ?, ?)",
        args: [r.id, r.filing_id, r.seq, r.title, r.raw_text],
      });
      rawCount++;
    }

    const items = local.prepare(
      "SELECT id, raw_item_id, title, category, summary, procedures_json, standard_refs_json, confidence, ifrs_refs_json FROM kam_items WHERE raw_item_id = ?"
    ).all(r.id);
    for (const it of items) {
      const existingItem = await turso.execute({ sql: "SELECT id FROM kam_items WHERE id = ?", args: [it.id] });
      if (existingItem.rows.length > 0) continue;
      await turso.execute({
        sql: "INSERT INTO kam_items (id, raw_item_id, title, category, summary, procedures_json, standard_refs_json, confidence, ifrs_refs_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        args: [it.id, it.raw_item_id, it.title, it.category, it.summary, it.procedures_json, it.standard_refs_json, it.confidence ?? null, it.ifrs_refs_json ?? null],
      });
      itemCount++;
    }
  }
}
console.log(`kam_raw_items: ${rawCount}건 삽입`);
console.log(`kam_items: ${itemCount}건 삽입`);

local.close();
console.log("완료");
