"use client";

import { useEffect, useId, useState, type ReactNode } from "react";

/** Underline tabs (wallet style). Panels are rendered on the server and passed in. Arrow keys move between tabs. A URL hash matching a tab id (e.g. /scan#appliances) opens that tab. */
export function Tabs({ tabs, variant = "underline" }: { tabs: { id: string; label: string; content: ReactNode }[]; variant?: "underline" | "segmented" }) {
  const segmented = variant === "segmented";
  const [active, setActive] = useState(tabs[0]?.id);
  const base = useId();
  useEffect(() => {
    const fromHash = tabs.find((t) => `#${t.id}` === window.location.hash);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the hash is only readable after mount
    if (fromHash) setActive(fromHash.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on mount; a later refresh must not undo the person's tab choice
  }, []);
  return (
    <div>
      <div
        role="tablist"
        className={
          segmented
            ? // Pill switch that floats under the sticky app header (h-14), like the bottom nav.
              "sticky top-14 z-30 grid auto-cols-fr grid-flow-col gap-1 rounded-full bg-surface/85 p-1 shadow-sheet backdrop-blur-xl"
            : "flex gap-6 border-b border-border"
        }
        onKeyDown={(e) => {
          if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "Home" && e.key !== "End") return;
          const i = tabs.findIndex((t) => t.id === active);
          const next =
            e.key === "Home" ? tabs[0] : e.key === "End" ? tabs[tabs.length - 1] : tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
          e.preventDefault();
          setActive(next.id);
          document.getElementById(`${base}-tab-${next.id}`)?.focus();
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            id={`${base}-tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={active === t.id}
            aria-controls={`${base}-panel-${t.id}`}
            tabIndex={active === t.id ? 0 : -1}
            onClick={() => setActive(t.id)}
            className={
              segmented
                ? `h-11 cursor-pointer rounded-full text-small font-semibold transition-colors duration-100 ${
                    active === t.id ? "bg-lime text-on-lime" : "text-muted hover:text-text"
                  }`
                : `-mb-px min-h-11 cursor-pointer border-b-2 pb-2 font-display text-[1.0625rem] font-semibold transition-colors duration-100 ${
                    active === t.id ? "border-text text-text" : "border-transparent text-muted hover:text-text"
                  }`
            }
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.id} id={`${base}-panel-${t.id}`} role="tabpanel" aria-labelledby={`${base}-tab-${t.id}`} hidden={active !== t.id} className="pt-3">
          {t.content}
        </div>
      ))}
    </div>
  );
}
