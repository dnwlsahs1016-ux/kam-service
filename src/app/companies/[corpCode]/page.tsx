import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCompanyName,
  getStandardTitles,
  listAllCompanyCodes,
  listCasesForCompany,
} from "@/db/queries";
import { dartMainReportUrl } from "@/lib/dart";
import { codesParamForCode, findMinorByCode } from "@/lib/industryGroups";

export const revalidate = 3600; // ingestion만 데이터를 바꾼다 - 매 요청 Turso 왕복 대신 1시간 캐시

export async function generateStaticParams() {
  const codes = await listAllCompanyCodes();
  return codes.map((corpCode) => ({ corpCode }));
}

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ corpCode: string }>;
}) {
  const { corpCode } = await params;
  const company = await getCompanyName(corpCode);
  if (!company) notFound();

  const cases = await listCasesForCompany(corpCode);
  if (cases.length === 0) notFound();

  const minor = company.industryCode ? findMinorByCode(company.industryCode) : null;
  const industryName = minor?.label ?? null;
  const industryCodesParam = codesParamForCode(company.industryCode);

  const allCodes = cases.flatMap((c) => c.standardRefs.map((r) => r.ksaCode));
  const titleMap = await getStandardTitles(allCodes);

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <Link href="/search" className="text-sm text-accent hover:underline">
          ← 기업 검색
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{company.corpName}</h1>
        {industryName && (
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{industryName}</p>
        )}
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          이 회사의 감사보고서에서 실제로 보고된 핵심감사사항 {cases.length}건입니다.
        </p>

        <div className="mt-6 flex flex-col gap-6">
          {cases.map((c) => (
            <article
              key={c.id}
              className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="font-medium">{c.title}</h2>
                <span className="shrink-0 flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                  {c.reportBasis && (
                    <span className="rounded border border-zinc-300 px-1.5 py-0.5 text-[11px] font-medium text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                      {c.reportBasis}기준
                    </span>
                  )}
                  FY{c.fiscalYear}
                </span>
              </div>
              <Link
                href={`/industries/${industryCodesParam}/${encodeURIComponent(c.category)}`}
                className="mt-1 inline-block text-xs text-accent hover:underline"
              >
                {c.category}
              </Link>

              <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{c.summary}</p>

              {c.procedures.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                    감사절차 체크리스트
                  </h3>
                  <ul className="mt-2 space-y-1.5">
                    {c.procedures.map((p, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <span className="mt-0.5 text-zinc-400">☐</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {c.procedureRefs.length > 0 && (
                <div className="mt-4 rounded-md bg-zinc-50 px-3 py-2.5 dark:bg-zinc-900/60">
                  <h3 className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                    한국공인회계사회 표준조서 참고 실증절차
                    <span className="ml-1 normal-case text-zinc-400 dark:text-zinc-500">
                      ({c.procedureRefs.map((r) => `${r.sheetCode}.${r.accountName}`).join(" / ")})
                    </span>
                  </h3>
                  <ul className="mt-1.5 space-y-1">
                    {c.procedureRefs.flatMap((r) => r.procedures).map((p, i) => (
                      <li key={i} className="flex gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                        <span className="mt-0.5 text-zinc-400">·</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {c.standardRefs.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                    관련 감사기준서
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {c.standardRefs.map((ref) => (
                      <Link
                        key={ref.ksaCode}
                        href={`/standards/${ref.ksaCode}`}
                        className="rounded-full border border-accent/30 bg-accent-soft px-3 py-1 text-xs text-accent hover:border-accent/60"
                      >
                        감사기준서 {ref.ksaCode}
                        {titleMap.get(ref.ksaCode) ? ` · ${titleMap.get(ref.ksaCode)}` : ""}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {c.ifrsRefs.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                    관련 회계기준서
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {c.ifrsRefs.map((ref) => (
                      <a
                        key={ref.code}
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full border border-zinc-300 bg-zinc-100 px-3 py-1 text-xs text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-500"
                        title="삼일아이닷컴에서 원문 보기 (한국회계기준원 저작권 이용 승인)"
                      >
                        {ref.code} · {ref.title}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {c.sourceUrl && (
                <div className="mt-4">
                  <h3 className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                    DART 원문 보기
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <a
                      href={dartMainReportUrl(c.sourceUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-600 hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:bg-zinc-900"
                    >
                      사업보고서
                    </a>
                    <a
                      href={c.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-600 hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:bg-zinc-900"
                    >
                      감사보고서
                    </a>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
