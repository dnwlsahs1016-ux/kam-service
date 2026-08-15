import Link from "next/link";
import { CompanySearch } from "@/components/CompanySearch";
import { GuideModal } from "@/components/GuideModal";

export default function StartPage() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-zinc-900">
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pt-10 pb-16">
        <Link href="/" className="text-sm text-accent hover:underline">
          ← 홈
        </Link>
        <h1 className="sr-only">시작하기</h1>
        <p className="mt-4 text-zinc-600 dark:text-zinc-400">
          기업별, 업종별, 회계법인별
          <br />
          원하는 방식으로 KAM 사례를 찾아보세요.
        </p>

        <div className="mt-8 flex flex-col gap-10">
          <GuideModal />

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              기업으로 찾기
            </h2>
            <div className="mt-3">
              <CompanySearch />
            </div>
          </div>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              혹은 업종으로 찾기
            </h2>
            <Link
              href="/industries"
              className="mt-3 flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:bg-accent-soft hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
            >
              <span>
                <span className="block text-sm font-medium sm:inline">업종별로 확인하러 가기</span>
                <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400 sm:ml-2 sm:mt-0 sm:inline">
                  금융 · 소비재 · 인프라 · 전자통신 · 제조업
                </span>
              </span>
              <span className="text-accent">→</span>
            </Link>
          </div>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              혹은 회계법인으로 찾기
            </h2>
            <Link
              href="/auditors"
              className="mt-3 flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:bg-accent-soft hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
            >
              <span>
                <span className="block text-sm font-medium sm:inline">회계법인별로 확인하러 가기</span>
                <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400 sm:ml-2 sm:mt-0 sm:inline">
                  삼일 · 삼정 · 안진 · 한영 · 기타
                </span>
              </span>
              <span className="text-accent">→</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
