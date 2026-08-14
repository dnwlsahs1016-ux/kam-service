"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  const pathname = usePathname();
  const onStartPage = pathname === "/start";

  return (
    <header className="border-b border-accent/20 bg-white dark:bg-zinc-950">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          title="홈으로 이동"
          className="flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1.5 text-sm font-semibold tracking-tight text-accent hover:bg-accent/20"
        >
          <span className="h-2 w-2 rounded-full bg-accent" />
          KAM사절차
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href={onStartPage ? "/" : "/start"}
            className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-accent-foreground hover:opacity-90"
          >
            {onStartPage ? "홈화면으로" : "시작하기"}
          </Link>
        </div>
      </div>
    </header>
  );
}
