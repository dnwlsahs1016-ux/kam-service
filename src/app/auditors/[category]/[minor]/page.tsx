import Link from "next/link";
import { notFound } from "next/navigation";
import { isAuditorCategory, listAuditorFirms, listCompaniesForAuditor } from "@/db/queries";
import { AUDITOR_COLORS } from "@/lib/auditorColors";

export const revalidate = 3600; // ingestion만 데이터를 바꾼다 - 매 요청 Turso 왕복 대신 1시간 캐시

export async function generateStaticParams() {
  const firms = await listAuditorFirms();
  const params: { category: string; minor: string }[] = [];
  for (const f of firms) {
    const majors = await listCompaniesForAuditor(f.category);
    for (const major of majors) {
      for (const minor of major.minors) params.push({ category: f.category, minor: minor.label });
    }
  }
  return params;
}

export default async function AuditorMinorPage({
  params,
}: {
  params: Promise<{ category: string; minor: string }>;
}) {
  const { category: rawCategory, minor: rawMinor } = await params;
  const category = decodeURIComponent(rawCategory);
  const minorLabel = decodeURIComponent(rawMinor);

  if (!isAuditorCategory(category)) notFound();
  const colors = AUDITOR_COLORS[category];

  const majors = await listCompaniesForAuditor(category);
  const major = majors.find((g) => g.minors.some((m) => m.label === minorLabel));
  const minor = major?.minors.find((m) => m.label === minorLabel);
  if (!major || !minor) notFound();

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pt-10 pb-16">
        <Link href={`/auditors/${category}`} className={`text-sm hover:underline ${colors.text}`}>
          ← {category}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{minor.label}</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          {major.major}업종에서 {category === "기타" ? "4대 회계법인 외 회계법인" : `${category}회계법인`}이 26년
          1분기 현재(분기보고서상) 감사인인 회사 {minor.companies.length}곳입니다.
        </p>

        <ul className="mt-6 flex flex-wrap gap-3">
          {minor.companies.map((c) => (
            <li key={c.corpCode} className="w-[calc(50%-0.375rem)] sm:w-[calc(33.333%-0.5rem)]">
              <Link
                href={`/companies/${c.corpCode}`}
                className={`flex h-full flex-col items-center justify-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 py-3 text-center dark:border-zinc-800 dark:bg-zinc-950 ${colors.hoverBg}`}
              >
                <span className="text-sm font-medium">{c.corpName}</span>
                {c.priorAdtorName && c.priorAdtorName !== c.adtorName && (
                  <span className={`inline-flex w-fit items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${colors.fill} ${colors.text}`}>
                    감사인변경({c.priorAdtorName.replace(/회계법인$/, "")}→{c.adtorName.replace(/회계법인$/, "")})
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-zinc-400 dark:text-zinc-500">
          표시된 감사인은 2026년 1분기보고서 기준입니다. 회사별 KAM 사례는 2022~2025년
          감사보고서에서 가져온 것이며, 해당 사례의 실제 감사인은 지금과 다를 수 있습니다.
        </p>
      </main>
    </div>
  );
}
