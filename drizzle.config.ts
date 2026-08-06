import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// TURSO_DATABASE_URL이 있으면(배포/원격) turso 다이얼렉트로, 없으면(로컬 개발) 로컬
// SQLite 파일로 붙는다 - src/db/index.ts의 런타임 연결 로직과 동일한 분기.
export default process.env.TURSO_DATABASE_URL
  ? defineConfig({
      schema: "./src/db/schema.ts",
      out: "./drizzle",
      dialect: "turso",
      dbCredentials: {
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
      },
    })
  : defineConfig({
      schema: "./src/db/schema.ts",
      out: "./drizzle",
      dialect: "sqlite",
      dbCredentials: {
        url: (process.env.DATABASE_URL ?? "file:./local.db").replace(/^file:/, ""),
      },
    });
