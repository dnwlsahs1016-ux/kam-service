"use client";

import { useRef } from "react";

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

  function reset() {
    const v = ref.current;
    if (!v) return;
    v.pause();
    v.currentTime = 0;
  }

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      muted
      playsInline
      preload="auto"
      className={className}
      onMouseEnter={() => ref.current?.play()}
      onMouseLeave={reset}
      onEnded={reset}
    />
  );
}
