import Link from "next/link";
import { notFound } from "next/navigation";
import { getStandardTitles, listCasesForCategory } from "@/db/queries";
import { findMinorByCodesParam } from "@/lib/industryGroups";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ industryCode: string; category: string }>;
}) {
  const { industryCode: rawCodesParam, category: rawCategory } = await params;
  const codesParam = decodeURIComponent(rawCodesParam);
  const category = decodeURIComponent(rawCategory);
  const minor = findMinorByCodesParam(codesParam);
  const industryName = minor?.label ?? codesParam;

  const cases = await listCasesForCategory(minor?.codes ?? codesParam.split(","), category);

  if (cases.length === 0) notFound();

  const allCodes = cases.flatMap((c) => c.standardRefs.map((r) => r.ksaCode));
  const titleMap = await getStandardTitles(allCodes);

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <Link href={`/industries/${codesParam}`} className="text-sm text-accent hover:underline">
          ← {industryName}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{category}</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          {industryName} 업종에서 실제로 보고된 사례 {cases.length}건입니다. 각 사례의 감사절차를
          체크리스트로 참고하세요. 관련 기준서를 클릭하시면 감사기준서 원문 및 회계기준서 원문으로
          이동합니다. 또한, DART 원문 보기를 누르시면 해당 사업보고서 및 감사보고서 원문으로
          이동합니다.
        </p>

        <div className="mt-6 flex flex-col gap-6">
          {cases.map((c) => (
            <article
              key={c.id}
              className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="font-medium">{c.title}</h2>
                <span className="shrink-0 text-sm text-zinc-500 dark:text-zinc-400">
                  {c.corpName} · FY{c.fiscalYear}
                </span>
              </div>

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
                    표준조서 참고 실증절차
                    <span className="ml-1 normal-case text-zinc-400 dark:text-zinc-500">
                      (한공회 4000, {c.procedureRefs.map((r) => `${r.sheetCode}.${r.accountName}`).join(" / ")})
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
                <a
                  href={c.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-block text-xs text-zinc-400 hover:underline"
                >
                  DART 원문 보기 →
                </a>
              )}
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
