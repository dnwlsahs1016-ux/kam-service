import Link from "next/link";

export function EntryOptions() {
  return (
    <Link
      href="/start"
      className="flex flex-col items-center gap-6 rounded-2xl border border-accent/20 bg-accent-soft px-8 py-12 text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:flex-row sm:items-center sm:justify-between sm:text-left"
    >
      <p className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
        기업별, 업종별, 회계법인별
        <br className="hidden sm:block" /> 원하는 방식으로 KAM 사례를 찾아보세요.
      </p>
      <span className="shrink-0 rounded-full bg-accent px-8 py-4 text-base font-semibold text-accent-foreground shadow-sm">
        지금 이용하러 가기 →
      </span>
    </Link>
  );
}
