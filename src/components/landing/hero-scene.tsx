"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useDarkMode, useIsNarrow, usePrefersReducedMotion } from "@/lib/use-media";
import { EXAMPLE_HOUSES, EXAMPLE_WINNER } from "./example-data";

// three.js only loads in the browser, after the page has had a chance to paint.
const BarangayScene = dynamic(() => import("./barangay-scene"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-md bg-border/40" />,
});

const BIGGEST = EXAMPLE_HOUSES.reduce((a, b) => (b.size > a.size ? b : a));
const CAP = 30;

/** A light first paint while the 3D scene is still loading, and the reduced-motion view. */
function StaticBars({ onShow3d }: { onShow3d?: () => void }) {
  return (
    <div className="relative h-full">
      <div aria-hidden className="flex h-full items-end justify-center gap-2 px-3 pb-8">
        {EXAMPLE_HOUSES.map((h) => {
          const winner = h.label === EXAMPLE_WINNER.label;
          return (
            <div key={h.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
              <span className="num text-small font-semibold">{Number(h.score.toFixed(1))}%</span>
              <div
                className={`w-full max-w-9 rounded-t-sm ${winner ? "bg-lime" : "bg-text/80"}`}
                style={{ height: `${Math.max(14, Math.min(180, (Math.max(h.score, 0) / CAP) * 180))}px` }}
              />
              <div className="h-5 w-full max-w-11 rounded-sm bg-surface shadow-receipt" />
            </div>
          );
        })}
      </div>
      {onShow3d && (
        <button
          type="button"
          onClick={onShow3d}
          className="absolute bottom-2 right-2 inline-flex h-9 items-center rounded-full border border-border bg-surface px-3 text-small font-semibold shadow-receipt"
        >
          View 3D
        </button>
      )}
    </div>
  );
}

export function HeroScene() {
  const reduced = usePrefersReducedMotion();
  const narrow = useIsNarrow();
  const dark = useDarkMode();
  const [show3d, setShow3d] = useState(false);

  useEffect(() => {
    if (reduced || narrow) return;
    const w = window as typeof window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setShow3d(true), { timeout: 2500 });
      return () => w.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(() => setShow3d(true), 1200);
    return () => window.clearTimeout(id);
  }, [reduced, narrow]);

  return (
    <figure className="flex flex-col">
      <div className="relative h-80 w-full cursor-grab touch-pan-y active:cursor-grabbing md:h-110">
        {show3d ? (
          <BarangayScene reduced={reduced} dark={dark} />
        ) : (
          <StaticBars onShow3d={narrow && !reduced ? () => setShow3d(true) : undefined} />
        )}
      </div>
      <figcaption className="text-small text-muted">
        Example barangay. Bar height = % saved vs the same month last year. {EXAMPLE_WINNER.label}, a small home, leads with{" "}
        {EXAMPLE_WINNER.score}%; the biggest house has {BIGGEST.score}%.{" "}
        {show3d
          ? "Drag to look around."
          : reduced
            ? "Bars show the same data."
            : narrow
              ? "Tap View 3D to explore the street."
              : "The 3D street loads in a moment."}
      </figcaption>
      {/* Same data for screen readers, since the canvas is visual only.
          The wrapper keeps the table's intrinsic width from causing a horizontal scrollbar. */}
      <div className="sr-only">
        <table>
          <caption>Example ranking by percent saved</caption>
          <thead>
            <tr>
              <th>House</th>
              <th>Last year kWh</th>
              <th>This month kWh</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {EXAMPLE_HOUSES.map((h) => (
              <tr key={h.label}>
                <td>{h.label}</td>
                <td>{h.lastYear}</td>
                <td>{h.now}</td>
                <td>{h.score}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
