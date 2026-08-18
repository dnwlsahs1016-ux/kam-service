import Link from "next/link";
import { CompanySearch } from "@/components/CompanySearch";
import { searchCompanies } from "@/db/queries";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const results = q.trim() ? await searchCompanies(q) : [];

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-zinc-900">
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pt-10 pb-16">
        <div>
          <CompanySearch defaultQuery={q} />
        </div>

        {q.trim() && (
          <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
            &lsquo;{q}&rsquo; 검색 결과 {results.length}건
          </p>
        )}

        <ul className="mt-3 divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-700 dark:border-zinc-700">
          {results.map((r) => (
            <li key={r.corpCode}>
              <Link
                href={`/companies/${r.corpCode}`}
                className="flex items-center justify-between px-4 py-4 hover:bg-accent-soft dark:hover:bg-zinc-900"
              >
                <span className="font-medium">{r.corpName}</span>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">{r.industryName}</span>
              </Link>
            </li>
          ))}
        </ul>

        {q.trim() && results.length === 0 && (
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
            아직 수집된 KAM 사례가 없는 기업이거나, 저희가 다루는 업종이 아닐 수 있어요.
          </p>
        )}
      </main>
    </div>
  );
}
