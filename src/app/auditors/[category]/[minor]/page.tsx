import Link from "next/link";
import { notFound } from "next/navigation";
import { isAuditorCategory, listCompaniesForAuditor } from "@/db/queries";

export default async function AuditorMinorPage({
  params,
}: {
  params: Promise<{ category: string; minor: string }>;
}) {
  const { category: rawCategory, minor: rawMinor } = await params;
  const category = decodeURIComponent(rawCategory);
  const minorLabel = decodeURIComponent(rawMinor);

  if (!isAuditorCategory(category)) notFound();

  const majors = await listCompaniesForAuditor(category);
  const major = majors.find((g) => g.minors.some((m) => m.label === minorLabel));
  const minor = major?.minors.find((m) => m.label === minorLabel);
  if (!major || !minor) notFound();

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <Link href={`/auditors/${category}`} className="text-sm text-accent hover:underline">
          ← {category}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{minor.label}</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          {major.major} · {category === "기타" ? "4대 회계법인 외 회계법인" : `${category}회계법인`}이
          현재 감사인인 회사 {minor.companies.length}곳입니다.
        </p>

        <ul className="mt-6 flex flex-wrap gap-3">
          {minor.companies.map((c) => (
            <li key={c.corpCode} className="w-[calc(50%-0.375rem)] sm:w-[calc(33.333%-0.5rem)]">
              <Link
                href={`/companies/${c.corpCode}`}
                className="flex h-full flex-col rounded-lg border border-zinc-200 bg-white px-3 py-3 hover:border-accent/40 hover:bg-accent-soft dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
              >
                <span className="text-sm font-medium">{c.corpName}</span>
                <span className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{c.adtorName}</span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
