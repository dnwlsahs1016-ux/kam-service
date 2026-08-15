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

const SUN_PATH =
  "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0-15a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1Zm0 18a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1ZM4.22 4.22a1 1 0 0 1 1.42 0l.7.7a1 1 0 1 1-1.42 1.42l-.7-.7a1 1 0 0 1 0-1.42Zm13.44 13.44a1 1 0 0 1 1.42 0l.7.7a1 1 0 0 1-1.42 1.42l-.7-.7a1 1 0 0 1 0-1.42ZM2 12a1 1 0 0 1 1-1h1a1 1 0 1 1 0 2H3a1 1 0 0 1-1-1Zm18 0a1 1 0 0 1 1-1h1a1 1 0 1 1 0 2h-1a1 1 0 0 1-1-1ZM4.22 19.78a1 1 0 0 1 0-1.42l.7-.7a1 1 0 1 1 1.42 1.42l-.7.7a1 1 0 0 1-1.42 0Zm13.44-13.44a1 1 0 0 1 0-1.42l.7-.7a1 1 0 1 1 1.42 1.42l-.7.7a1 1 0 0 1-1.42 0Z";
const MOON_PATH =
  "M21.64 13a1 1 0 0 0-1.05-.14 8.05 8.05 0 0 1-3.37.73 8.15 8.15 0 0 1-8.14-8.1c0-1.28.31-2.5.8-3.65a1 1 0 0 0-1.31-1.32A10.05 10.05 0 1 0 22 14.05a1 1 0 0 0-.36-1.05Z";

// 아이콘 하나만 있으면 지금이 무슨 모드인지 그 아이콘만 보고 헷갈릴 수 있다 - 해/달을
// 나란히 두고 현재 모드 쪽에 배경을 줘서 한눈에 보이게 한다.
export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <div className="flex items-center gap-0.5 rounded-full bg-zinc-100 p-1 dark:bg-zinc-800">
      <button
        type="button"
        onClick={() => setDark(false)}
        aria-label="라이트 모드로 전환"
        aria-pressed={!dark}
        className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
          !dark
            ? "bg-white text-accent shadow-sm dark:bg-zinc-950"
            : "text-zinc-400 dark:text-zinc-500"
        }`}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
          <path d={SUN_PATH} />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => setDark(true)}
        aria-label="다크 모드로 전환"
        aria-pressed={dark}
        className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
          dark
            ? "bg-white text-accent shadow-sm dark:bg-zinc-950"
            : "text-zinc-400 dark:text-zinc-500"
        }`}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
          <path d={MOON_PATH} />
        </svg>
      </button>
    </div>
  );
}
