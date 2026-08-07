import Link from "next/link";
import { notFound } from "next/navigation";
import { isAuditorCategory, listCompaniesForAuditor } from "@/db/queries";

export default async function AuditorCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: rawCategory } = await params;
  const category = decodeURIComponent(rawCategory);

  if (!isAuditorCategory(category)) notFound();

  const majors = await listCompaniesForAuditor(category);
  if (majors.length === 0) notFound();

  const totalCount = majors.reduce(
    (sum, g) => sum + g.minors.reduce((s, m) => s + m.companies.length, 0),
    0
  );

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <Link href="/auditors" className="text-sm text-accent hover:underline">
          ← 회계법인 목록
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{category}</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          2026년 1분기보고서 기준 현재 감사인이 {category === "기타" ? "4대 회계법인 외 회계법인" : `${category}회계법인`}인
          회사 {totalCount}곳을 업종별로 모았습니다.
        </p>

        <div className="mt-6 space-y-8">
          {majors.map((major) => (
            <div key={major.major}>
              <h2 className="text-sm font-semibold text-accent">{major.major}</h2>
              <div className="mt-3 space-y-5">
                {major.minors.map((minor) => (
                  <div key={minor.label}>
                    <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                      {minor.label} · {minor.companies.length}개사
                    </h3>
                    <ul className="mt-2 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-zinc-200 bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-800 sm:grid-cols-3">
                      {minor.companies.map((c) => (
                        <li key={c.corpCode} className="bg-white dark:bg-zinc-950">
                          <Link
                            href={`/companies/${c.corpCode}`}
                            className="flex flex-col px-3 py-3 hover:bg-accent-soft dark:hover:bg-zinc-900"
                          >
                            <span className="text-sm font-medium">{c.corpName}</span>
                            <span className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                              {c.adtorName}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
