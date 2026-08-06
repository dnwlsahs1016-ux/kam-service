import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-accent/20 bg-white dark:bg-zinc-950">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-2 px-6 py-4">
        <span className="h-2 w-2 rounded-full bg-accent" />
        <Link href="/" className="text-sm font-semibold tracking-tight text-foreground">
          KAM사절차
        </Link>
      </div>
    </header>
  );
}
