import Link from "next/link";
import { listIndustryGroups } from "@/db/queries";
import { CompanySearch } from "@/components/CompanySearch";

const GUIDE_STEPS = [
  { src: "/guide/1-search.webm", title: "1. 검색", desc: "기업 이름으로 검색하거나 업종에서 관심 분야를 선택하세요." },
  { src: "/guide/2-checklist.webm", title: "2. 확인", desc: "카테고리별 KAM 사례와 감사절차 체크리스트를 확인하세요." },
  { src: "/guide/3-standard.webm", title: "3. 기준서 이동", desc: "관련 기준서를 클릭하면 원문으로 바로 이동합니다." },
];

export default async function Home() {
  const groups = await listIndustryGroups();

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <div className="rounded-xl border border-accent/25 bg-accent-soft px-6 py-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">KAM사절차</h1>
          <p className="mt-3 text-zinc-700 dark:text-zinc-300">
            <strong className="font-semibold text-accent">핵심감사사항(KAM)이란</strong> 감사인이
            해당 기간 재무제표 감사에서 특히 유의적이라고 판단하여 감사보고서에 별도로 설명하는
            사항입니다. 이 서비스는 실제 상장사 감사보고서에 실린 KAM 사례를 업종·카테고리별로 모아,
            실무에 참고할 수 있도록 만든 학습 자료입니다. 각 사례는 관련
            감사기준서·회계기준서 원문으로 바로 연결되어 있어, 관련 계정에 대한 업무 수행시 근거
            기준까지 함께 확인할 수 있습니다.
          </p>
        </div>

        <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">이용 가이드</h3>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {GUIDE_STEPS.map((step) => (
              <div key={step.title}>
                <div className="overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800">
                  <video
                    src={step.src}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full"
                  />
                </div>
                <div className="mt-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {step.title}
                </div>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

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
          분류한 것이라, 실제 업종에 대한 인식과 다를 수 있습니다.
        </p>
      </main>
    </div>
  );
}
