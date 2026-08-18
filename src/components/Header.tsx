"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { openGuideModal } from "./GuideModal";
import { ThemeToggle } from "./ThemeToggle";

// 모바일은 네 항목을 텍스트로 다 담을 폭이 없다 - 아이콘 하나로 축약해서 줄바꿈·가로
// 스크롤 없이 한 줄에 다 보이게 한다(데스크톱은 폭이 넉넉해 텍스트 그대로 사용).
function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}
function BuildingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
      <rect x="4" y="3" width="16" height="18" rx="1" />
      <path d="M9 21v-4h6v4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 7h1M14 7h1M9 11h1M14 11h1" strokeLinecap="round" />
    </svg>
  );
}
function BriefcaseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeLinecap="round" />
      <path d="M3 13h18" strokeLinecap="round" />
    </svg>
  );
}

// 활성 항목은 배경 알약 대신 밑줄 + 아주 살짝 확대로 표시한다.
const NAV_ITEM_BASE =
  "flex h-8 w-8 shrink-0 items-center justify-center border-b-2 pb-1 transition-transform sm:h-auto sm:w-auto sm:gap-1.5 sm:px-1 sm:pb-1 sm:text-sm sm:font-medium";
const NAV_ITEM_ACTIVE = "scale-105 border-accent text-accent";
const NAV_ITEM_INACTIVE =
  "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200";

const NAV_LINKS = [
  { href: "#guide", label: "이용가이드", Icon: PlayIcon, onClick: openGuideModal },
  { href: "/search", label: "기업으로 찾기", Icon: SearchIcon },
  { href: "/industries", label: "업종으로 찾기", Icon: BuildingIcon },
  { href: "/auditors", label: "회계법인으로 찾기", Icon: BriefcaseIcon },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 bg-zinc-50 dark:bg-zinc-900">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-2 px-4 py-3 sm:px-6 sm:py-4">
        <Link
          href="/"
          title="홈으로 이동"
          className="flex shrink-0 items-center rounded-full bg-accent-soft px-3 py-1.5 text-sm font-semibold tracking-tight text-accent hover:bg-accent/20"
        >
          KAM사절차
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4">
          {NAV_LINKS.map((link) => {
            // "이용가이드"는 페이지 이동이 아니라 전역 모달을 여는 버튼이라 활성 판정에서
            // 뺀다 - 다른 세 개만 지금 보고 있는 페이지 기준으로 밑줄을 준다.
            const active = !link.onClick && (pathname === link.href || pathname.startsWith(`${link.href}/`));
            const className = `${NAV_ITEM_BASE} ${active ? NAV_ITEM_ACTIVE : NAV_ITEM_INACTIVE}`;
            const content = (
              <>
                <span className="sm:hidden">
                  <link.Icon />
                </span>
                <span className="hidden sm:inline">{link.label}</span>
              </>
            );
            if (link.onClick) {
              return (
                <button
                  key={link.href}
                  type="button"
                  onClick={link.onClick}
                  title={link.label}
                  aria-label={link.label}
                  className={className}
                >
                  {content}
                </button>
              );
            }
            return (
              <Link key={link.href} href={link.href} title={link.label} aria-label={link.label} className={className}>
                {content}
              </Link>
            );
          })}
        </nav>
        <div className="shrink-0">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
