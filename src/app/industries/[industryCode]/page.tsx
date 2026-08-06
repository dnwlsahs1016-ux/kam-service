import Link from "next/link";
import { notFound } from "next/navigation";
import { listCategoriesForIndustry } from "@/db/queries";
import { findMinorByCodesParam } from "@/lib/industryGroups";

export default async function IndustryPage({
  params,
}: {
  params: Promise<{ industryCode: string }>;
}) {
  const { industryCode: rawCodesParam } = await params;
  const codesParam = decodeURIComponent(rawCodesParam);
  const minor = findMinorByCodesParam(codesParam);
  const categories = await listCategoriesForIndustry(minor?.codes ?? codesParam.split(","));

  if (categories.length === 0) notFound();

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <Link href="/" className="text-sm text-accent hover:underline">
          ← 업종 목록
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{minor?.label ?? codesParam}</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          실제 감사보고서에서 나타난 핵심감사사항을 카테고리별로 모았습니다. 카테고리를 선택하면 왜
          유의적인지와 어떤 절차로 대응했는지를 볼 수 있습니다.
        </p>

        <ul className="mt-6 divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {(() => {
            const total = categories.reduce((sum, c) => sum + c.count, 0);
            return categories.map((c) => {
              const pct = total > 0 ? Math.round((c.count / total) * 1000) / 10 : 0;
              return (
                <li key={c.category} className="relative overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-accent-soft"
                    style={{ width: `${pct}%` }}
                    aria-hidden
                  />
                  <Link
                    href={`/industries/${codesParam}/${encodeURIComponent(c.category)}`}
                    className="relative flex items-center justify-between px-4 py-4 hover:bg-accent/10"
                  >
                    <span className="font-medium">{c.category}</span>
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">
                      {c.count}건 · {pct}%
                    </span>
                  </Link>
                </li>
              );
            });
          })()}
        </ul>
      </main>
    </div>
  );
}
