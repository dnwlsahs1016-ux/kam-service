"use client";

import { useSyncExternalStore } from "react";

let listeners: Array<() => void> = [];

function subscribe(callback: () => void) {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter((l) => l !== callback);
  };
}

function getSnapshot() {
  return document.documentElement.classList.contains("dark");
}

function getServerSnapshot() {
  return false;
}

function setDark(next: boolean) {
  document.documentElement.classList.toggle("dark", next);
  localStorage.setItem("theme", next ? "dark" : "light");
  listeners.forEach((l) => l());
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <button
      type="button"
      onClick={() => setDark(!dark)}
      aria-label={dark ? "라이트 모드로 전환" : "다크 모드로 전환"}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 hover:text-foreground dark:text-zinc-400 dark:hover:bg-zinc-800"
    >
      {dark ? (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4.5 w-4.5">
          <path d="M21.64 13a1 1 0 0 0-1.05-.14 8.05 8.05 0 0 1-3.37.73 8.15 8.15 0 0 1-8.14-8.1c0-1.28.31-2.5.8-3.65a1 1 0 0 0-1.31-1.32A10.05 10.05 0 1 0 22 14.05a1 1 0 0 0-.36-1.05Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4.5 w-4.5">
          <path d="M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0-15a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1Zm0 18a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1ZM4.22 4.22a1 1 0 0 1 1.42 0l.7.7a1 1 0 1 1-1.42 1.42l-.7-.7a1 1 0 0 1 0-1.42Zm13.44 13.44a1 1 0 0 1 1.42 0l.7.7a1 1 0 0 1-1.42 1.42l-.7-.7a1 1 0 0 1 0-1.42ZM2 12a1 1 0 0 1 1-1h1a1 1 0 1 1 0 2H3a1 1 0 0 1-1-1Zm18 0a1 1 0 0 1 1-1h1a1 1 0 1 1 0 2h-1a1 1 0 0 1-1-1ZM4.22 19.78a1 1 0 0 1 0-1.42l.7-.7a1 1 0 1 1 1.42 1.42l-.7.7a1 1 0 0 1-1.42 0Zm13.44-13.44a1 1 0 0 1 0-1.42l.7-.7a1 1 0 1 1 1.42 1.42l-.7.7a1 1 0 0 1-1.42 0Z" />
        </svg>
      )}
    </button>
  );
}
