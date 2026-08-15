import Link from "next/link";
import { listIndustryGroups } from "@/db/queries";

export const revalidate = 3600; // ingestion만 데이터를 바꾼다 - 매 요청 Turso 왕복 대신 1시간 캐시

export default async function IndustriesPage() {
  const groups = await listIndustryGroups();

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-zinc-900">
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pt-10 pb-16">
        <Link href="/start" className="text-sm text-accent hover:underline">
          ← 다른 방식으로 찾기
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">업종에서 직접 확인</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          업종을 선택하면 그 업종에서 실제로 보고된 핵심감사사항을 카테고리별로 볼 수 있습니다.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-zinc-200 bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-800 sm:grid-cols-5">
          {groups.map((group) => (
            <div key={group.major} className="flex flex-col bg-white dark:bg-zinc-950">
              <div className="border-b border-accent/20 bg-accent-soft px-3 py-2 text-center text-sm font-semibold text-foreground">
                {group.major}
              </div>
              <div className="flex flex-1 flex-col">
                {group.items.map((item) => (
                  <Link
                    key={item.label}
                    href={`/industries/${item.codes.join(",")}`}
                    className="border-b border-zinc-100 px-3 py-3 text-center text-sm hover:bg-accent-soft dark:border-zinc-900 dark:hover:bg-zinc-900"
                  >
                    <div className="font-medium">{item.label}</div>
                    <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      {item.companyCount}개사 · {item.kamCount}건
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
          모든 상장사를 커버하지는 않습니다. 업종 구분은 DART API가 제공하는 업종코드(KSIC) 기준으로
          분류한 것이며, 실제 업종에 대한 인식과 다를 수 있습니다.
        </p>
      </main>
    </div>
  );
}
