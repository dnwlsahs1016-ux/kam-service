import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "./index";
import { companies, kamFilings, kamItems, kamRawItems, standards } from "./schema";
import { INDUSTRY_GROUPS } from "@/lib/industryGroups";
import { getIfrsRefsForCategory, ifrsRefFromCode, type IfrsRef } from "@/lib/ifrsStandards";
import { getProcedureRefsForCategory } from "@/lib/auditProcedureReferences";

// "기타"처럼 개별 항목 단위로 채워진 ifrs_refs_json(classify_ifrs_other.py)이 있으면 그걸 쓰고,
// 없으면 카테고리 단위 고정 매핑으로 폴백한다.
function resolveIfrsRefs(category: string, ifrsRefsJson: string | null): IfrsRef[] {
  if (ifrsRefsJson) {
    const codes = JSON.parse(ifrsRefsJson) as string[];
    const refs = codes.map(ifrsRefFromCode).filter((r): r is IfrsRef => r !== null);
    if (refs.length > 0) return refs;
  }
  return getIfrsRefsForCategory(category);
}

export async function listIndustryGroups() {
  const groups = [];
  for (const group of INDUSTRY_GROUPS) {
    const items = [];
    for (const item of group.items) {
      const row = await db
        .select({
          kamCount: sql<number>`count(distinct ${kamItems.id})`,
          companyCount: sql<number>`count(distinct ${companies.corpCode})`,
        })
        .from(companies)
        .innerJoin(kamFilings, eq(kamFilings.corpCode, companies.corpCode))
        .innerJoin(kamRawItems, eq(kamRawItems.filingId, kamFilings.id))
        .innerJoin(kamItems, eq(kamItems.rawItemId, kamRawItems.id))
        .where(inArray(companies.industryCode, item.codes));
      items.push({ ...item, kamCount: row[0]?.kamCount ?? 0, companyCount: row[0]?.companyCount ?? 0 });
    }
    groups.push({ major: group.major, items: items.filter((i) => i.kamCount > 0) });
  }
  return groups.filter((g) => g.items.length > 0);
}

export async function listCategoriesForIndustry(codes: string[]) {
  const rows = await db
    .select({
      category: kamItems.category,
      count: sql<number>`count(*)`,
    })
    .from(kamItems)
    .innerJoin(kamRawItems, eq(kamRawItems.id, kamItems.rawItemId))
    .innerJoin(kamFilings, eq(kamFilings.id, kamRawItems.filingId))
    .innerJoin(companies, eq(companies.corpCode, kamFilings.corpCode))
    .where(inArray(companies.industryCode, codes))
    .groupBy(kamItems.category)
    .orderBy(desc(sql`count(*)`));
  return rows;
}

export async function listCasesForCategory(codes: string[], category: string) {
  const rows = await db
    .select({
      id: kamItems.id,
      title: kamItems.title,
      summary: kamItems.summary,
      proceduresJson: kamItems.proceduresJson,
      standardRefsJson: kamItems.standardRefsJson,
      ifrsRefsJson: kamItems.ifrsRefsJson,
      corpName: companies.corpName,
      fiscalYear: kamFilings.fiscalYear,
      sourceUrl: kamFilings.sourceUrl,
    })
    .from(kamItems)
    .innerJoin(kamRawItems, eq(kamRawItems.id, kamItems.rawItemId))
    .innerJoin(kamFilings, eq(kamFilings.id, kamRawItems.filingId))
    .innerJoin(companies, eq(companies.corpCode, kamFilings.corpCode))
    .where(and(inArray(companies.industryCode, codes), eq(kamItems.category, category)))
    .orderBy(desc(kamFilings.fiscalYear));
  return rows.map((r) => ({
    ...r,
    procedures: JSON.parse(r.proceduresJson) as string[],
    standardRefs: JSON.parse(r.standardRefsJson) as { ksaCode: string }[],
    ifrsRefs: resolveIfrsRefs(category, r.ifrsRefsJson),
    procedureRefs: getProcedureRefsForCategory(category),
  }));
}

export async function searchCompanies(q: string) {
  if (!q.trim()) return [];
  const rows = await db
    .selectDistinct({
      corpCode: companies.corpCode,
      corpName: companies.corpName,
      industryCode: companies.industryCode,
      industryName: companies.industryName,
    })
    .from(companies)
    .innerJoin(kamFilings, eq(kamFilings.corpCode, companies.corpCode))
    .innerJoin(kamRawItems, eq(kamRawItems.filingId, kamFilings.id))
    .innerJoin(kamItems, eq(kamItems.rawItemId, kamRawItems.id))
    .where(sql`${companies.corpName} LIKE ${"%" + q.trim() + "%"}`)
    .limit(30);
  return rows;
}

export async function getCompanyName(corpCode: string) {
  const row = await db
    .select({ corpName: companies.corpName, industryCode: companies.industryCode })
    .from(companies)
    .where(eq(companies.corpCode, corpCode))
    .limit(1);
  return row[0] ?? null;
}

export async function listCasesForCompany(corpCode: string) {
  const rows = await db
    .select({
      id: kamItems.id,
      title: kamItems.title,
      category: kamItems.category,
      summary: kamItems.summary,
      proceduresJson: kamItems.proceduresJson,
      standardRefsJson: kamItems.standardRefsJson,
      ifrsRefsJson: kamItems.ifrsRefsJson,
      fiscalYear: kamFilings.fiscalYear,
      sourceUrl: kamFilings.sourceUrl,
    })
    .from(kamItems)
    .innerJoin(kamRawItems, eq(kamRawItems.id, kamItems.rawItemId))
    .innerJoin(kamFilings, eq(kamFilings.id, kamRawItems.filingId))
    .where(eq(kamFilings.corpCode, corpCode))
    .orderBy(desc(kamFilings.fiscalYear));
  return rows.map((r) => ({
    ...r,
    procedures: JSON.parse(r.proceduresJson) as string[],
    standardRefs: JSON.parse(r.standardRefsJson) as { ksaCode: string }[],
    ifrsRefs: resolveIfrsRefs(r.category, r.ifrsRefsJson),
    procedureRefs: getProcedureRefsForCategory(r.category),
  }));
}

// 인용은 문단 단위가 아니라 기준서 단위로만 한다 (classify_kam.py 상단 주석 참고).
export async function getStandardTitles(ksaCodes: string[]) {
  if (ksaCodes.length === 0) return new Map<string, string>();
  const codes = [...new Set(ksaCodes)];
  const rows = await db
    .selectDistinct({ ksaCode: standards.ksaCode, ksaTitle: standards.ksaTitle })
    .from(standards)
    .where(inArray(standards.ksaCode, codes));
  return new Map(rows.map((r) => [r.ksaCode, r.ksaTitle]));
}

export async function getStandard(ksaCode: string) {
  const rows = await db
    .select()
    .from(standards)
    .where(eq(standards.ksaCode, ksaCode))
    .orderBy(standards.id);
  return rows;
}

/** 문단 본문에서 "감사기준서 200" 같은 다른 기준서 언급을 링크로 바꿀 때, 실제 존재하는
 * 코드만 링크로 만들기 위한 전체 코드 목록. */
export async function getAllStandardCodes(): Promise<Set<string>> {
  const rows = await db.selectDistinct({ ksaCode: standards.ksaCode }).from(standards);
  return new Set(rows.map((r) => r.ksaCode));
}
