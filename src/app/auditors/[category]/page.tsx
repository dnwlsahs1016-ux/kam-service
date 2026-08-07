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

  const groups = await listCompaniesForAuditor(category);
  if (groups.length === 0) notFound();

  const totalCount = groups.reduce((sum, g) => sum + g.companies.length, 0);

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

        <div className="mt-6 space-y-6">
          {groups.map((group) => (
            <div key={group.industryLabel}>
              <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                {group.industryLabel} · {group.companies.length}개사
              </h2>
              <ul className="mt-2 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-zinc-200 bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-800 sm:grid-cols-3">
                {group.companies.map((c) => (
                  <li key={c.corpCode} className="bg-white dark:bg-zinc-950">
                    <Link
                      href={`/companies/${c.corpCode}`}
                      className="flex flex-col px-3 py-3 hover:bg-accent-soft dark:hover:bg-zinc-900"
                    >
                      <span className="text-sm font-medium">{c.corpName}</span>
                      <span className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{c.adtorName}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
