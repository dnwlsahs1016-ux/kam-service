"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { searchCompaniesAction } from "@/app/actions";

type Suggestion = {
  corpCode: string;
  corpName: string;
  industryName: string | null;
};

export function CompanySearch() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (query.trim().length < 1) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      const results = await searchCompaniesAction(query);
      setSuggestions(results);
      setActiveIndex(-1);
      setOpen(true);
    }, 200); // 타이핑마다 바로 쏘지 않도록 디바운스
    return () => clearTimeout(timer);
  }, [query]);

  function selectSuggestion(s: Suggestion) {
    setOpen(false);
    router.push(`/companies/${s.corpCode}`);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      if (activeIndex >= 0) {
        e.preventDefault();
        selectSuggestion(suggestions[activeIndex]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={boxRef} className="relative">
      <form
        action="/search"
        className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white py-1.5 pl-4 pr-1.5 shadow-sm transition-shadow duration-200 focus-within:shadow-md dark:border-zinc-700 dark:bg-zinc-800"
        onSubmit={() => setOpen(false)}
      >
        <input
          type="text"
          name="q"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={open}
          aria-controls="company-search-listbox"
          aria-activedescendant={activeIndex >= 0 ? `company-search-option-${activeIndex}` : undefined}
          placeholder="기업이름을 입력하세요"
          autoComplete="off"
          className="flex-1 bg-transparent py-1 text-sm outline-none"
        />
        <button
          type="submit"
          className="shrink-0 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
        >
          검색
        </button>
      </form>

      {open && suggestions.length > 0 && (
        <ul
          id="company-search-listbox"
          role="listbox"
          className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          {suggestions.map((s, i) => (
            <li key={s.corpCode} id={`company-search-option-${i}`} role="option" aria-selected={i === activeIndex}>
              <button
                type="button"
                onClick={() => selectSuggestion(s)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm ${
                  i === activeIndex ? "bg-accent-soft dark:bg-zinc-800" : "hover:bg-accent-soft dark:hover:bg-zinc-800"
                }`}
              >
                <span className="font-medium">{s.corpName}</span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">{s.industryName}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
