"use client";

import { useEffect, useRef, useState } from "react";

// 각 가이드는 하나의 이어지는 영상이다(회사 검색 흐름 / 업종 탐색 흐름). 단계 사이에
// 화면이 끊기지 않도록, 클립을 따로 녹화하는 대신 실제 조작을 처음부터 끝까지 한 번에
// 녹화하고, 그중 몇 초 지점부터가 몇 번째 "단계"인지만 stepBoundaries로 표시한다.
// currentTime이 그 경계를 넘어가면 표시되는 단계 번호/설명만 갈아끼운다.
const GUIDES = [
  {
    key: "company",
    label: "기업으로 찾기",
    src: "/guide/guide-tour.mp4",
    poster: "/guide/guide-tour-poster.png",
    stepBoundaries: [0, 5.546, 8.338],
    steps: [
      { title: "1. 검색", desc: "기업 이름으로 검색하세요." },
      { title: "2. 확인", desc: "그 회사의 KAM 사례와 감사절차 체크리스트를 확인하세요." },
      { title: "3. 기준서 이동", desc: "관련 기준서를 클릭하면 원문으로 바로 이동합니다." },
    ],
  },
  {
    key: "industry",
    label: "업종에서 찾기",
    src: "/guide/guide-tour-industry.mp4",
    poster: "/guide/guide-tour-industry-poster.png",
    stepBoundaries: [0, 3.304, 5.619],
    steps: [
      { title: "1. 업종 선택", desc: "관심 있는 업종을 선택하세요." },
      { title: "2. 카테고리 선택", desc: "업종 내 주요 KAM 카테고리를 선택하세요." },
      { title: "3. 기준서 이동", desc: "관련 기준서를 클릭하면 원문으로 바로 이동합니다." },
    ],
  },
];

export function GuideModal() {
  const [open, setOpen] = useState(false);
  const [guideIndex, setGuideIndex] = useState(0);
  const [step, setStep] = useState(0);
  const [readyFlags, setReadyFlags] = useState<boolean[]>(() => GUIDES.map(() => false));
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  // ref 콜백을 렌더마다 새로 만들면(인라인 화살표 함수) React가 매 렌더마다 null ->
  // 엘리먼트로 다시 붙인다 - onTimeUpdate가 초당 여러 번 setStep을 호출해 리렌더가
  // 잦은 상황이라 이 churn이 재생 상태에 영향을 줄 수 있어, 인덱스별 콜백을 한 번만
  // 만들어 고정한다.
  const refCallbacksRef = useRef<Array<(el: HTMLVideoElement | null) => void>>([]);
  if (refCallbacksRef.current.length !== GUIDES.length) {
    refCallbacksRef.current = GUIDES.map((_, i) => (el: HTMLVideoElement | null) => {
      videoRefs.current[i] = el;
    });
  }

  const guide = GUIDES[guideIndex];

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    setStep(0);
    // 두 가이드 모두 모달이 열려있는 동안 계속 프리로드되고 있어서, 이미 준비된(canplaythrough
    // 지난) 영상으로 전환할 때는 흰 화면 없이 바로 재생한다.
    const v = videoRefs.current[guideIndex];
    if (v && readyFlags[guideIndex]) {
      v.currentTime = 0;
      v.play();
    }
    // 비활성 탭 영상은 멈춰서 리소스를 아낀다.
    videoRefs.current.forEach((el, i) => {
      if (el && i !== guideIndex) el.pause();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guideIndex]);

  // onCanPlayThrough 안에서의 play() 호출이 타이밍상 씹히는 경우가 있어서(예: 이벤트
  // 발생 시점에 아직 다른 렌더가 진행 중이던 경우), readyFlags가 바뀔 때마다 활성 탭
  // 영상이 준비됐는데 멈춰있으면 다시 재생을 시도하는 안전망을 둔다.
  useEffect(() => {
    const v = videoRefs.current[guideIndex];
    if (v && readyFlags[guideIndex] && v.paused) {
      v.play().catch(() => {});
    }
  }, [guideIndex, readyFlags]);

  function seekToStep(i: number) {
    const v = videoRefs.current[guideIndex];
    if (!v) return;
    v.currentTime = guide.stepBoundaries[i] + 0.05;
    setStep(i);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setGuideIndex(0);
          setOpen(true);
        }}
        className="mt-6 flex w-full items-center gap-3 rounded-lg border border-accent/30 bg-accent-soft px-4 py-3 text-left hover:border-accent/60"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <svg viewBox="0 0 24 24" fill="currentColor" className="ml-0.5 h-4 w-4">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
        <span className="flex-1">
          <span className="text-sm font-semibold text-accent">이용 가이드 보러가기</span>
          <span className="ml-2 text-xs text-zinc-600 dark:text-zinc-400">
            검색부터 기준서 확인까지, 화면으로 안내
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
            className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-zinc-950"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
              <div className="flex gap-1">
                {GUIDES.map((g, i) => (
                  <button
                    key={g.key}
                    type="button"
                    onClick={() => setGuideIndex(i)}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                      i === guideIndex
                        ? "bg-accent-soft text-accent"
                        : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
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
              {GUIDES.map((g, i) => {
                const active = i === guideIndex;
                const isReady = readyFlags[i];
                return (
                  <div
                    key={g.key}
                    className="absolute inset-0"
                    style={{ display: active ? "block" : "none" }}
                  >
                    <img
                      src={g.poster}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                      style={{ visibility: isReady ? "hidden" : "visible" }}
                    />
                    {active && !isReady && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
                      </div>
                    )}
                    <video
                      ref={refCallbacksRef.current[i]}
                      src={g.src}
                      muted
                      loop
                      playsInline
                      preload="auto"
                      className="absolute inset-0 h-full w-full object-cover"
                      style={{ visibility: isReady ? "visible" : "hidden" }}
                      onCanPlayThrough={() => {
                        setReadyFlags((prev) => {
                          if (prev[i]) return prev;
                          const next = [...prev];
                          next[i] = true;
                          return next;
                        });
                        if (i === guideIndex) videoRefs.current[i]?.play();
                      }}
                      onTimeUpdate={() => {
                        if (i !== guideIndex) return;
                        const t = videoRefs.current[i]?.currentTime ?? 0;
                        let s = 0;
                        for (let j = 0; j < g.stepBoundaries.length; j++) {
                          if (t >= g.stepBoundaries[j]) s = j;
                        }
                        setStep(s);
                      }}
                    />
                  </div>
                );
              })}
            </div>

            <div className="px-5 py-4">
              <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {guide.steps[step].title}
              </div>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{guide.steps[step].desc}</p>

              <div className="mt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => seekToStep(Math.max(step - 1, 0))}
                  disabled={step === 0}
                  className="rounded-md px-3 py-1.5 text-sm text-zinc-500 hover:text-accent disabled:opacity-30 disabled:hover:text-zinc-500 dark:text-zinc-400"
                >
                  ← 이전
                </button>
                <div className="flex gap-1.5">
                  {guide.steps.map((s, i) => (
                    <button
                      key={s.title}
                      type="button"
                      aria-label={s.title}
                      onClick={() => seekToStep(i)}
                      className={`h-1.5 w-5 rounded-full transition-colors ${
                        i === step ? "bg-accent" : "bg-zinc-200 dark:bg-zinc-700"
                      }`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => seekToStep(Math.min(step + 1, guide.steps.length - 1))}
                  disabled={step === guide.steps.length - 1}
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
