import Link from "next/link";
import { listAuditorFirms } from "@/db/queries";

// 카테고리별로 고정 순서·고정 색을 쓴다(막대 색이 필터링 등으로 다시 칠해지면 안 됨).
// dataviz 스킬의 검증된 기본 팔레트 슬롯 1~4(블루/오렌지/아쿠아/옐로우)를, 각 법인의 실제
// 글로벌 브랜드 컬러에 맞춰 배정한다 - 삼일=PwC(오렌지), 삼정=KPMG(블루), 안진=Deloitte(그린
// 계열), 한영=EY(옐로우). 아주 옅은 배경 채우기로 쓴다(/industries/[industryCode] 페이지의
// bg-accent-soft 막대와 같은 스타일). 기타는 팔레트 색 대신 중립 회색으로.
const FIRM_FILL_CLASS: Record<string, string> = {
  삼일: "bg-[#eb6834]/10 dark:bg-[#d95926]/15",
  삼정: "bg-[#2a78d6]/10 dark:bg-[#3987e5]/15",
  안진: "bg-[#1baf7a]/10 dark:bg-[#199e70]/15",
  한영: "bg-[#eda100]/12 dark:bg-[#c98500]/18",
  기타: "bg-zinc-200/70 dark:bg-zinc-700/50",
};

export default async function AuditorsPage() {
  const firms = await listAuditorFirms();
  const totalFirmCount = firms.reduce((sum, f) => sum + f.count, 0);

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
                  className={`absolute inset-y-0 left-0 ${FIRM_FILL_CLASS[firm.category]}`}
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
