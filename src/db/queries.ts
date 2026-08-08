import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "./index";
import { companies, companyAuditors, kamFilings, kamItems, kamRawItems, standards } from "./schema";
import { findMinorByCode, INDUSTRY_GROUPS } from "@/lib/industryGroups";
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
  // 예전엔 소분류(15개)마다 DB 쿼리를 하나씩 순차로 날렸다(N+1) - Turso는 원격 DB라 왕복
  // 지연이 쿼리 수만큼 그대로 쌓여서 이 페이지만 유독 느렸다. industryCode별 집계를 한
  // 쿼리로 가져온 뒤, 소분류 하나엔 서로 겹치지 않는 code가 여러 개 묶여 있을 뿐이므로
  // (회사는 industryCode를 하나만 가진다) JS에서 코드별 집계를 그대로 합산한다.
  const allCodes = INDUSTRY_GROUPS.flatMap((group) => group.items.flatMap((item) => item.codes));
  const rows = await db
    .select({
      industryCode: companies.industryCode,
      kamCount: sql<number>`count(distinct ${kamItems.id})`,
      companyCount: sql<number>`count(distinct ${companies.corpCode})`,
    })
    .from(companies)
    .innerJoin(kamFilings, eq(kamFilings.corpCode, companies.corpCode))
    .innerJoin(kamRawItems, eq(kamRawItems.filingId, kamFilings.id))
    .innerJoin(kamItems, eq(kamItems.rawItemId, kamRawItems.id))
    .where(inArray(companies.industryCode, allCodes))
    .groupBy(companies.industryCode);
  const countsByCode = new Map(rows.map((r) => [r.industryCode, r]));

  const groups = INDUSTRY_GROUPS.map((group) => {
    const items = group.items.map((item) => {
      let kamCount = 0;
      let companyCount = 0;
      for (const code of item.codes) {
        const c = countsByCode.get(code);
        if (c) {
          kamCount += c.kamCount;
          companyCount += c.companyCount;
        }
      }
      return { ...item, kamCount, companyCount };
    });
    return { major: group.major, items: items.filter((i) => i.kamCount > 0) };
  });
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
      corpCode: companies.corpCode,
      corpName: companies.corpName,
      fiscalYear: kamFilings.fiscalYear,
      reportBasis: kamFilings.reportBasis,
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

const AUDITOR_ORDER = ["삼일", "삼정", "안진", "한영", "기타"] as const;
export type AuditorCategory = (typeof AUDITOR_ORDER)[number];

export function isAuditorCategory(value: string): value is AuditorCategory {
  return (AUDITOR_ORDER as readonly string[]).includes(value);
}

export async function listAuditorFirms() {
  const rows = await db
    .select({ category: companyAuditors.category, count: sql<number>`count(*)` })
    .from(companyAuditors)
    .groupBy(companyAuditors.category);
  const counts = new Map(rows.map((r) => [r.category, r.count]));
  return AUDITOR_ORDER.map((category) => ({ category, count: counts.get(category) ?? 0 }));
}

export async function listCompaniesForAuditor(category: AuditorCategory) {
  const rows = await db
    .select({
      corpCode: companies.corpCode,
      corpName: companies.corpName,
      industryCode: companies.industryCode,
      industryName: companies.industryName,
      adtorName: companyAuditors.adtorName,
      priorAdtorName: companyAuditors.priorAdtorName,
    })
    .from(companyAuditors)
    .innerJoin(companies, eq(companies.corpCode, companyAuditors.corpCode))
    .where(eq(companyAuditors.category, category))
    .orderBy(companies.corpName);

  // 홈 화면 업종 그리드와 같은 대분류-소분류 체계(INDUSTRY_GROUPS)로 묶는다. 그 체계에
  // 매핑되지 않는 업종코드는 "기타 업종" 대분류 하나로 모은다.
  type Row = { corpCode: string; corpName: string; adtorName: string; priorAdtorName: string | null };
  const byMinorLabel = new Map<string, Row[]>();
  const unmatched: Row[] = [];
  for (const r of rows) {
    const minor = r.industryCode ? findMinorByCode(r.industryCode) : null;
    const row = {
      corpCode: r.corpCode,
      corpName: r.corpName,
      adtorName: r.adtorName,
      priorAdtorName: r.priorAdtorName,
    };
    if (!minor) {
      unmatched.push(row);
      continue;
    }
    if (!byMinorLabel.has(minor.label)) byMinorLabel.set(minor.label, []);
    byMinorLabel.get(minor.label)!.push(row);
  }

  const majors = INDUSTRY_GROUPS.map((group) => ({
    major: group.major,
    minors: group.items
      .map((item) => ({ label: item.label, companies: byMinorLabel.get(item.label) ?? [] }))
      .filter((m) => m.companies.length > 0),
  })).filter((g) => g.minors.length > 0);

  if (unmatched.length > 0) {
    majors.push({ major: "기타 업종", minors: [{ label: "기타", companies: unmatched }] });
  }

  return majors;
}

// generateStaticParams용 - KAM 데이터가 있는 전체 회사 코드.
export async function listAllCompanyCodes() {
  const rows = await db
    .selectDistinct({ corpCode: companies.corpCode })
    .from(companies)
    .innerJoin(kamFilings, eq(kamFilings.corpCode, companies.corpCode))
    .innerJoin(kamRawItems, eq(kamRawItems.filingId, kamFilings.id))
    .innerJoin(kamItems, eq(kamItems.rawItemId, kamRawItems.id));
  return rows.map((r) => r.corpCode);
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
  // companies.industry_name은 DART 원본 값이라 비어있는 경우가 많다(예: 삼성전자) - 화면
  // 표시용 업종 라벨은 industryGroups.ts의 코드 매핑으로 우선 채우고, 매핑이 없을 때만
  // 원본 값으로 폴백한다.
  return rows.map((r) => ({
    ...r,
    industryName: (r.industryCode ? findMinorByCode(r.industryCode)?.label : null) ?? r.industryName,
  }));
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
      reportBasis: kamFilings.reportBasis,
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
