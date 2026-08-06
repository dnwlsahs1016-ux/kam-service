// local.db의 standards 테이블(각주 정리 재적재분)을 Turso에 다시 동기화한다.
// 기존 Turso standards 행을 지우고 local.db 기준으로 다시 넣는다(다른 테이블은 건드리지 않음).
import Database from "better-sqlite3";
import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".env.local") });

const local = new Database(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "local.db"));
const turso = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

const columns = ["id", "ksa_code", "ksa_title", "para_no", "para_type", "page_no", "content"];
const rows = local.prepare(`SELECT ${columns.join(", ")} FROM standards`).all();
console.log(`standards: ${rows.length}건 재동기화 시작`);

await turso.execute("DELETE FROM standards");

const sql = `INSERT INTO standards (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`;
const BATCH_SIZE = 200;
for (let i = 0; i < rows.length; i += BATCH_SIZE) {
  const chunk = rows.slice(i, i + BATCH_SIZE);
  await turso.batch(
    chunk.map((row) => ({ sql, args: columns.map((c) => row[c] ?? null) })),
    "write"
  );
  process.stdout.write(`  ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}\r`);
}
console.log("\n완료");
local.close();
