import Link from "next/link";
import { notFound } from "next/navigation";
import { isAuditorCategory, listCompaniesForAuditor } from "@/db/queries";
import { AUDITOR_COLORS } from "@/lib/auditorColors";

export default async function AuditorCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: rawCategory } = await params;
  const category = decodeURIComponent(rawCategory);

  if (!isAuditorCategory(category)) notFound();
  const colors = AUDITOR_COLORS[category];

  const majors = await listCompaniesForAuditor(category);
  if (majors.length === 0) notFound();

  const totalCount = majors.reduce(
    (sum, g) => sum + g.minors.reduce((s, m) => s + m.companies.length, 0),
    0
  );

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <Link href="/auditors" className={`text-sm hover:underline ${colors.text}`}>
          ← 회계법인 목록
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{category}</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          2026년 1분기보고서 기준 현재 감사인이 {category === "기타" ? "4대 회계법인 외 회계법인" : `${category}회계법인`}인
          회사 {totalCount}곳을 업종별로 모았습니다. 업종을 선택하면 해당 회사 목록을 볼 수
          있습니다.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-zinc-200 bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-800 sm:grid-cols-5">
          {majors.map((major) => (
            <div key={major.major} className="flex flex-col bg-white dark:bg-zinc-950">
              <div className={`border-b px-3 py-2 text-center text-sm font-semibold text-foreground ${colors.border} ${colors.fill}`}>
                {major.major}
              </div>
              <div className="flex flex-1 flex-col">
                {major.minors.map((minor) => (
                  <Link
                    key={minor.label}
                    href={`/auditors/${category}/${encodeURIComponent(minor.label)}`}
                    className={`border-b border-zinc-100 px-3 py-3 text-center text-sm dark:border-zinc-900 ${colors.hoverBg}`}
                  >
                    <div className="font-medium">{minor.label}</div>
                    <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      {minor.companies.length}개사
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
          여기 묶인 감사인은 2026년 1분기보고서 기준입니다. 회사별 KAM 사례는 2022~2025년
          감사보고서에서 가져온 것이라, 그 사례의 실제 감사인은 지금과 다를 수 있습니다.
        </p>
      </main>
    </div>
  );
}
