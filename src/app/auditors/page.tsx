import Link from "next/link";
import { listAuditorFirms } from "@/db/queries";
import { AUDITOR_COLORS } from "@/lib/auditorColors";

export const revalidate = 3600; // ingestion만 데이터를 바꾼다 - 매 요청 Turso 왕복 대신 1시간 캐시

export default async function AuditorsPage() {
  const firms = await listAuditorFirms();
  const totalFirmCount = firms.reduce((sum, f) => sum + f.count, 0);

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-zinc-900">
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pt-10 pb-16">
        <Link href="/start" className="text-sm text-accent hover:underline">
          ← 다른 방식으로 찾기
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">회계법인별로 찾기</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          회계법인을 선택하면 그 법인이 2026년 1분기보고서 기준 현재 감사인으로 있는 회사를
          업종별로 볼 수 있습니다.
        </p>

        <div className="mt-6 divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {firms.map((firm) => {
            const pct = totalFirmCount > 0 ? Math.round((firm.count / totalFirmCount) * 1000) / 10 : 0;
            return (
              <Link
                key={firm.category}
                href={`/auditors/${firm.category}`}
                className="relative flex items-center justify-between overflow-hidden bg-white px-4 py-4 hover:bg-black/[0.02] dark:bg-zinc-950 dark:hover:bg-white/[0.03]"
              >
                <div
                  className={`absolute inset-y-0 left-0 ${AUDITOR_COLORS[firm.category].fill}`}
                  style={{ width: `${pct}%` }}
                  aria-hidden
                />
                <span className="relative font-medium">{firm.category}</span>
                <span className="relative text-sm text-zinc-500 dark:text-zinc-400">
                  {firm.count}건 · {pct}%
                </span>
              </Link>
            );
          })}
        </div>

        <p className="mt-4 text-xs text-zinc-400 dark:text-zinc-500">
          KAM 데이터가 있는 회사 중, 2026년 1분기보고서에 감사인이 공시된 회사만 대상으로
          합니다. 감사인 명칭은 DART 공시 원문 그대로이며, 4대 회계법인(삼일·삼정·안진·한영)
          외에는 &lsquo;기타&rsquo;로 묶어서 보여줍니다.
        </p>
      </main>
    </div>
  );
}
