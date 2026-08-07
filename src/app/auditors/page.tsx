import Link from "next/link";
import { listAuditorFirms } from "@/db/queries";

export default async function AuditorsPage() {
  const firms = await listAuditorFirms();

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <Link href="/" className="text-sm text-accent hover:underline">
          ← 홈으로
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">회계법인별로 찾기</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          회계법인을 선택하면 그 법인이 2026년 1분기보고서 기준 현재 감사인으로 있는 회사를
          업종별로 볼 수 있습니다.
        </p>

        <ul className="mt-6 divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {firms.map((firm) => (
            <li key={firm.category}>
              <Link
                href={`/auditors/${firm.category}`}
                className="flex items-center justify-between px-4 py-4 hover:bg-accent/10"
              >
                <span className="font-medium">{firm.category}</span>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">{firm.count}개사</span>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-xs text-zinc-400 dark:text-zinc-500">
          KAM 데이터가 있는 회사 중, 2026년 1분기보고서에 감사인이 공시된 회사만 대상으로
          합니다. 감사인 명칭은 DART 공시 원문 그대로이며, 4대 회계법인(삼일·삼정·안진·한영)
          외에는 &lsquo;기타&rsquo;로 묶어서 보여줍니다.
        </p>
      </main>
    </div>
  );
}
