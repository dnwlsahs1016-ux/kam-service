import Link from "next/link";
import { listAuditorFirms, listIndustryGroups } from "@/db/queries";
import { CompanySearch } from "@/components/CompanySearch";
import { GuideModal } from "@/components/GuideModal";

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

export default async function Home() {
  const groups = await listIndustryGroups();
  const firms = await listAuditorFirms();
  const totalFirmCount = firms.reduce((sum, f) => sum + f.count, 0);

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <div className="rounded-xl border border-accent/25 bg-accent-soft px-6 py-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">KAM사절차</h1>
          <p className="mt-3 text-zinc-700 dark:text-zinc-300">
            <strong className="font-semibold text-accent">핵심감사사항(KAM)이란</strong>{" "}
            감사인의 전문가적 판단에 따라, 당기 재무제표 감사에서 가장 유의적인 사항으로
            감사보고서에 별도로 기재하는 사항입니다.{" "}
            <strong className="font-semibold text-accent">&lsquo;KAM사절차&rsquo; 서비스는</strong>{" "}
            실제 상장사 감사보고서에 실린 KAM 사례를 업종·카테고리별로 모아, 실무 및
            회계법인 면접 준비에 도움을 줄 수 있도록 만든 학습 자료입니다. 각 사례는 관련
            감사기준서·회계기준서 원문으로 바로 연결되어 있어, 관련 계정에 대한 업무 수행시 근거
            기준까지 함께 확인할 수 있습니다.
          </p>
        </div>

        <GuideModal />

        <h2 className="mt-10 text-sm font-medium text-zinc-500 dark:text-zinc-400">기업으로 찾기</h2>
        <div className="mt-3">
          <CompanySearch />
        </div>

        <h2 className="mt-10 text-sm font-medium text-zinc-500 dark:text-zinc-400">
          혹은 아래 업종에서 직접 확인
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-zinc-200 bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-800 sm:grid-cols-5">
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

        <h2 className="mt-10 text-sm font-medium text-zinc-500 dark:text-zinc-400">
          혹은 회계법인별로 확인하기
        </h2>
        <div className="mt-3 divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
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
        <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
          2026년 1분기보고서 기준 현재 감사인입니다. 4대 회계법인(삼일·삼정·안진·한영) 외에는
          &lsquo;기타&rsquo;로 묶어서 보여줍니다.
        </p>
      </main>
    </div>
  );
}
