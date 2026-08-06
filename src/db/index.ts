import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

// TURSO_DATABASE_URL이 있으면(배포 환경) Turso 원격 DB에 연결하고,
// 없으면(로컬 개발) 로컬 SQLite 파일을 그대로 쓴다. libsql 클라이언트가 둘 다 지원한다.
const client = createClient({
  url: process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL ?? "file:./local.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
