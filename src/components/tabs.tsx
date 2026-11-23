"use client";

import { useId, useState, type ReactNode } from "react";

/** Underline tabs (wallet style). Panels are rendered on the server and passed in. Arrow keys move between tabs. */
export function Tabs({ tabs }: { tabs: { id: string; label: string; content: ReactNode }[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const base = useId();
  return (
    <div>
      <div
        role="tablist"
        className="flex gap-6 border-b border-border"
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
            className={`-mb-px min-h-11 cursor-pointer border-b-2 pb-2 font-display text-body font-semibold transition-colors duration-100 ${
              active === t.id ? "border-text text-text" : "border-transparent text-muted hover:text-text"
            }`}
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
