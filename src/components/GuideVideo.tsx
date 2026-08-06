"use client";

import { useRef, useState } from "react";

export function GuideVideo({
  src,
  poster,
  className,
}: {
  src: string;
  poster: string;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  function stop() {
    setPlaying(false);
    const v = ref.current;
    if (!v) return;
    v.pause();
    v.currentTime = 0;
  }

  function start() {
    const v = ref.current;
    if (!v) return;
    v.currentTime = 0;
    setPlaying(true);
    v.play();
  }

  return (
    <div
      className={`relative aspect-[31/16] ${className ?? ""}`}
      onMouseEnter={start}
      onMouseLeave={stop}
    >
      {/* 비디오가 한 번이라도 재생되면 poster 속성은 다시 안 뜨므로, 대기 상태에는 항상
          이 이미지를 직접 씌워서 보여준다 - seek(0) 리페인트 지연으로 흰 화면이 잠깐
          비치는 문제를 피한다. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={poster}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{ visibility: playing ? "hidden" : "visible" }}
      />
      <video
        ref={ref}
        src={src}
        muted
        playsInline
        preload="auto"
        className="block h-full w-full"
        style={{ visibility: playing ? "visible" : "hidden" }}
        onEnded={stop}
      />
    </div>
  );
}
