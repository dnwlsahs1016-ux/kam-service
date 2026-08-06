import { sqliteTable, text, integer, real, index, uniqueIndex } from "drizzle-orm/sqlite-core";

// 회계감사기준 전문 (감사기준서 200~720, 1100, 1200)
export const standards = sqliteTable(
  "standards",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ksaCode: text("ksa_code").notNull(), // e.g. "200", "701"
    ksaTitle: text("ksa_title").notNull(), // e.g. "독립된 감사인의 전반적인 목적 및 감사기준에 따른 감사의 수행"
    paraNo: text("para_no").notNull(), // e.g. "1", "A12"
    paraType: text("para_type", { enum: ["main", "application"] }).notNull(),
    pageNo: integer("page_no").notNull(),
    content: text("content").notNull(),
  },
  (t) => [uniqueIndex("standards_code_para_idx").on(t.ksaCode, t.paraNo)]
);

// 상장사 + 업종
export const companies = sqliteTable("companies", {
  corpCode: text("corp_code").primaryKey(), // DART 고유번호
  corpName: text("corp_name").notNull(),
  stockCode: text("stock_code"),
  industryCode: text("industry_code"),
  industryName: text("industry_name"),
});

// 감사보고서(사업보고서 첨부) 공시 건
export const kamFilings = sqliteTable(
  "kam_filings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    corpCode: text("corp_code")
      .notNull()
      .references(() => companies.corpCode),
    fiscalYear: integer("fiscal_year").notNull(), // e.g. 2022
    rceptNo: text("rcept_no").notNull(), // DART 접수번호
    filedDate: text("filed_date"), // YYYYMMDD
    sourceUrl: text("source_url"),
  },
  (t) => [
    uniqueIndex("kam_filings_rcept_idx").on(t.rceptNo),
    index("kam_filings_corp_year_idx").on(t.corpCode, t.fiscalYear),
  ]
);

// 감사보고서 원문에서 추출한 핵심감사사항 원문
export const kamRawItems = sqliteTable("kam_raw_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  filingId: integer("filing_id")
    .notNull()
    .references(() => kamFilings.id),
  seq: integer("seq").notNull(), // 같은 보고서 내 순번 (핵심감사사항이 여러 개일 수 있음)
  title: text("title"), // KAM 제목 (예: "재고자산의 평가")
  rawText: text("raw_text").notNull(),
});

// Claude로 정제한 카테고리/절차/기준서 인용
export const kamItems = sqliteTable("kam_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  rawItemId: integer("raw_item_id")
    .notNull()
    .references(() => kamRawItems.id),
  title: text("title").notNull(), // 해당 회사 보고서에 실린 KAM 제목 (예: "메모리 반도체 재고자산 순실현가치 평가")
  category: text("category").notNull(), // taxonomy 값
  summary: text("summary").notNull(),
  proceduresJson: text("procedures_json").notNull(), // JSON.stringify(string[])
  standardRefsJson: text("standard_refs_json").notNull(), // JSON.stringify({ksaCode, paraNo}[])
  confidence: real("confidence"),
  ifrsRefsJson: text("ifrs_refs_json"), // JSON.stringify({code, title}[]) - "기타" 카테고리처럼 카테고리 단위 고정 매핑으로는 부족한 경우, 개별 항목 단위로 채운다. null이면 카테고리 기준 고정 매핑을 사용한다.
});
