import Link from "next/link";
import { CompanySearch } from "@/components/CompanySearch";
import { GuideModal } from "@/components/GuideModal";

export default async function Home() {
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
          혹은 업종으로 찾기
        </h2>
        <Link
          href="/industries"
          className="mt-3 flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 hover:border-accent/40 hover:bg-accent-soft dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
        >
          <span>
            <span className="block text-sm font-medium">업종별로 확인하러 가기</span>
            <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
              금융 · 소비재 · 인프라 · 전자통신 · 제조업
            </span>
          </span>
          <span className="text-accent">→</span>
        </Link>

        <h2 className="mt-10 text-sm font-medium text-zinc-500 dark:text-zinc-400">
          혹은 회계법인으로 찾기
        </h2>
        <Link
          href="/auditors"
          className="mt-3 flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 hover:border-accent/40 hover:bg-accent-soft dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
        >
          <span>
            <span className="block text-sm font-medium">회계법인별로 확인하러 가기</span>
            <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
              삼일 · 삼정 · 안진 · 한영 · 기타
            </span>
          </span>
          <span className="text-accent">→</span>
        </Link>
      </main>
    </div>
  );
}
