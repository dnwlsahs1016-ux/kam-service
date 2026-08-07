"use client";

import { useEffect, useRef, useState } from "react";

const GUIDE_STEPS = [
  {
    src: "/guide/1-search.mp4",
    poster: "/guide/1-search.png",
    title: "1. 검색",
    desc: "기업 이름으로 검색하거나 업종에서 관심 분야를 선택하세요.",
  },
  {
    src: "/guide/2-checklist.mp4",
    poster: "/guide/2-checklist.png",
    title: "2. 확인",
    desc: "카테고리별 KAM 사례와 감사절차 체크리스트를 확인하세요.",
  },
  {
    src: "/guide/3-standard.mp4",
    poster: "/guide/3-standard.png",
    title: "3. 기준서 이동",
    desc: "관련 기준서를 클릭하면 원문으로 바로 이동합니다.",
  },
];

export function GuideModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowRight") setStep((s) => Math.min(s + 1, GUIDE_STEPS.length - 1));
      if (e.key === "ArrowLeft") setStep((s) => Math.max(s - 1, 0));
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    setReady(false);
  }, [step]);

  const current = GUIDE_STEPS[step];

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setStep(0);
          setOpen(true);
        }}
        className="mt-6 flex w-full items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 text-left hover:border-accent/50 dark:border-zinc-800 dark:bg-zinc-950"
      >
        <span>
          <span className="text-sm font-medium text-foreground">이용 가이드 보러가기</span>
          <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
            검색부터 기준서 확인까지, 화면으로 3단계 안내
          </span>
        </span>
        <span className="text-accent">→</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-zinc-950"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
              <span className="text-sm font-semibold text-foreground">이용 가이드</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="닫기"
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                ✕
              </button>
            </div>

            <div className="relative aspect-[31/16] bg-zinc-100 dark:bg-zinc-900">
              <img
                src={current.poster}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                style={{ visibility: ready ? "hidden" : "visible" }}
              />
              {!ready && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
                </div>
              )}
              <video
                key={current.src}
                ref={videoRef}
                src={current.src}
                muted
                loop
                playsInline
                preload="auto"
                className="absolute inset-0 h-full w-full object-cover"
                style={{ visibility: ready ? "visible" : "hidden" }}
                onCanPlayThrough={() => {
                  setReady(true);
                  videoRef.current?.play();
                }}
              />
            </div>

            <div className="px-5 py-4">
              <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{current.title}</div>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{current.desc}</p>

              <div className="mt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep((s) => Math.max(s - 1, 0))}
                  disabled={step === 0}
                  className="rounded-md px-3 py-1.5 text-sm text-zinc-500 hover:text-accent disabled:opacity-30 disabled:hover:text-zinc-500 dark:text-zinc-400"
                >
                  ← 이전
                </button>
                <div className="flex gap-1.5">
                  {GUIDE_STEPS.map((s, i) => (
                    <button
                      key={s.title}
                      type="button"
                      aria-label={s.title}
                      onClick={() => setStep(i)}
                      className={`h-1.5 w-5 rounded-full transition-colors ${
                        i === step ? "bg-accent" : "bg-zinc-200 dark:bg-zinc-700"
                      }`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setStep((s) => Math.min(s + 1, GUIDE_STEPS.length - 1))}
                  disabled={step === GUIDE_STEPS.length - 1}
                  className="rounded-md px-3 py-1.5 text-sm text-zinc-500 hover:text-accent disabled:opacity-30 disabled:hover:text-zinc-500 dark:text-zinc-400"
                >
                  다음 →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
