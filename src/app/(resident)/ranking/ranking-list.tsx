"use client";

import { useEffect, useRef, useState } from "react";
import { Award } from "lucide-react";
import { pct } from "@/components/ui";

export type RankingRow = {
  householdId: string;
  label: string;
  score: number;
  badges: string[];
};

/** The ranking list with a pinned "you" row while your real row is off-screen. */
export function RankingList({
  rows,
  mine,
  badgeLabels,
}: {
  rows: RankingRow[];
  mine: number;
  badgeLabels: Record<string, string>;
}) {
  const myRow = useRef<HTMLLIElement>(null);
  const [showPinned, setShowPinned] = useState(false);

  useEffect(() => {
    const row = myRow.current;
    if (!row || mine < 0) return;

    const observer = new IntersectionObserver(
      ([entry]) => setShowPinned(!entry.isIntersecting),
      { rootMargin: "0px 0px -120px 0px", threshold: 0 },
    );
    observer.observe(row);
    return () => observer.disconnect();
  }, [mine]);

  function showMe() {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    myRow.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  }

  const me = mine >= 0 ? rows[mine] : null;

  return (
    <>
      <ol className="divide-y divide-border rounded-md bg-surface shadow-receipt">
        {rows.map((r, i) => {
          const isMe = i === mine;
          return (
            <li
              key={r.householdId}
              ref={isMe ? myRow : undefined}
              aria-current={isMe ? "true" : undefined}
              className={`flex items-center gap-3 px-4 py-3 first:rounded-t-md last:rounded-b-md ${isMe ? "bg-primary-soft" : ""}`}
            >
              <span
                className={`num flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-semibold ${
                  i === 0 ? "bg-lime text-on-lime" : "bg-surface-2 text-muted"
                }`}
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {r.label}
                  {isMe && <span className="font-normal text-muted"> (you)</span>}
                </p>
                {r.badges.length > 0 && (
                  <p className="mt-0.5 flex flex-wrap gap-1">
                    {r.badges.map((b) => (
                      <span key={b} className="inline-flex items-center gap-1 rounded-full bg-green-soft px-2 text-small text-accent">
                        <Award size={12} aria-hidden />
                        {badgeLabels[b] ?? b}
                      </span>
                    ))}
                  </p>
                )}
              </div>
              <span className={`num text-h2 font-semibold ${i === 0 ? "text-primary" : ""}`}>{pct(r.score)}</span>
            </li>
          );
        })}
      </ol>

      {me && showPinned && (
        <div className="fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-20 mx-auto max-w-[400px]">
          <button
            type="button"
            onClick={showMe}
            aria-label="Scroll to my rank"
            className="flex w-full items-center gap-3 rounded-full border border-border bg-surface px-3 py-2 text-left shadow-sheet"
          >
            <span className="num flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-h2 font-semibold text-on-primary">
              {mine + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">
                {me.label} (you)
              </span>
              <span className="block text-small text-muted">Your rank · tap to find your row</span>
            </span>
            <span className="num shrink-0 text-h2 font-semibold text-primary">{pct(me.score)}</span>
          </button>
        </div>
      )}
    </>
  );
}
