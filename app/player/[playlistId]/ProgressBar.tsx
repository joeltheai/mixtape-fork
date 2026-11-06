"use client";

import { useState } from "react";

const fmt = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/** Pixel-style seek bar with elapsed / total time. Drag or click to jump. */
export default function ProgressBar({
  position,
  duration,
  onSeek,
}: {
  position: number;
  duration: number;
  onSeek: (ms: number) => void;
}) {
  // While dragging, show where the thumb is rather than the live position.
  const [drag, setDrag] = useState<number | null>(null);
  const shown = drag ?? position;
  const pct = duration ? `${Math.min(100, (shown / duration) * 100)}%` : "0%";

  const commit = () => {
    if (drag !== null) onSeek(drag);
    setDrag(null);
  };

  return (
    <div className="flex w-[min(84vw,30rem)] items-center gap-3 text-xl tabular-nums">
      <span className="w-12 text-right">{fmt(shown)}</span>
      <div className="relative h-5 flex-1">
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 bg-current opacity-30" />
        <div className="absolute left-0 top-1/2 h-1.5 -translate-y-1/2 bg-current" style={{ width: pct }} />
        <div
          className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 bg-current"
          style={{ left: pct }}
        />
        <input
          type="range"
          aria-label="Seek"
          min={0}
          max={duration || 1}
          step={1000}
          value={shown}
          disabled={!duration}
          onChange={(e) => setDrag(Number(e.target.value))}
          onPointerUp={commit}
          onKeyUp={commit}
          className="absolute inset-0 w-full cursor-pointer opacity-0 disabled:cursor-default"
        />
      </div>
      <span className="w-12">{fmt(duration)}</span>
    </div>
  );
}
