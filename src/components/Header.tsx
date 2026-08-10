import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-accent/20 bg-white dark:bg-zinc-950">
      <div className="mx-auto flex w-full max-w-3xl items-center px-6 py-4">
        <Link
          href="/"
          title="홈으로 이동"
          className="flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1.5 text-sm font-semibold tracking-tight text-accent hover:bg-accent/20"
        >
          <span className="h-2 w-2 rounded-full bg-accent" />
          KAM사절차
        </Link>
      </div>
    </header>
  );
}
