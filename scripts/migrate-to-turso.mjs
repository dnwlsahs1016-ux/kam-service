// 로컬 SQLite(local.db)의 데이터를 Turso로 복사한다.
// 사전 조건: TURSO_DATABASE_URL, TURSO_AUTH_TOKEN이 .env.local에 설정돼 있고,
// `npm run db:push`로 Turso 쪽에 스키마(빈 테이블)가 이미 만들어져 있어야 한다.
//
// 실행: node scripts/migrate-to-turso.mjs

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

// FK 의존 순서대로 나열 (부모 테이블 먼저)
const TABLES = [
  { name: "standards", columns: ["id", "ksa_code", "ksa_title", "para_no", "para_type", "page_no", "content"] },
  { name: "companies", columns: ["corp_code", "corp_name", "stock_code", "industry_code", "industry_name"] },
  { name: "kam_filings", columns: ["id", "corp_code", "fiscal_year", "rcept_no", "filed_date", "source_url"] },
  { name: "kam_raw_items", columns: ["id", "filing_id", "seq", "title", "raw_text"] },
  {
    name: "kam_items",
    columns: [
      "id",
      "raw_item_id",
      "title",
      "category",
      "summary",
      "procedures_json",
      "standard_refs_json",
      "confidence",
      "ifrs_refs_json",
    ],
  },
];

const BATCH_SIZE = 200;

async function migrateTable({ name, columns }) {
  const rows = local.prepare(`SELECT ${columns.join(", ")} FROM ${name}`).all();
  console.log(`${name}: ${rows.length}건 복사 시작`);

  const placeholders = `(${columns.map(() => "?").join(", ")})`;
  const sql = `INSERT INTO ${name} (${columns.join(", ")}) VALUES ${placeholders}`;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE);
    await turso.batch(
      chunk.map((row) => ({ sql, args: columns.map((c) => row[c] ?? null) })),
      "write"
    );
    process.stdout.write(`  ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}\r`);
  }
  console.log(`${name}: 완료 (${rows.length}건)`);
}

for (const table of TABLES) {
  await migrateTable(table);
}

console.log("전체 마이그레이션 완료");
local.close();
