"use client";

import { useEffect, useRef, useState } from "react";
import { MONTH, type DayId } from "./month";

/**
 * The billing month as a strip under the nav. Each day links to its section, and one lime marker
 * slides to whichever day's section is in the middle of the screen.
 */
export function MonthStrip() {
  const [active, setActive] = useState<DayId>("scan");
  const [marker, setMarker] = useState<{ x: number; w: number } | null>(null);
  const strip = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>("[data-day]");
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.find((e) => e.isIntersecting);
        if (!hit) return;
        const day = hit.target.getAttribute("data-day") as DayId;
        // The first section holds two days: Oct 1's bill and Oct 2's receipt. Keep Oct 1 if it was picked.
        setActive((prev) => (day === "scan" && prev === "bill" ? prev : day));
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const el = strip.current;
    const day = el?.querySelector<HTMLElement>(`[data-id="${active}"]`);
    if (!el || !day) return;
    // On phones the strip scrolls sideways: center today, so the days around it stay reachable.
    if (el.scrollWidth > el.clientWidth) {
      const instant = matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollTo({ left: day.offsetLeft - (el.clientWidth - day.offsetWidth) / 2, behavior: instant ? "auto" : "smooth" });
    }
    // Fires once on observe, then on every resize, so the marker always sits under today.
    const ro = new ResizeObserver(() => setMarker({ x: day.offsetLeft, w: day.offsetWidth }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [active]);

  return (
    <nav aria-label="One billing month" className="sticky top-0 z-40 bg-bg/90 backdrop-blur-md">
      <div
        ref={strip}
        className="relative mx-auto max-w-landing snap-x overflow-x-auto border-t-2 border-text [scrollbar-width:none] md:overflow-visible"
      >
        {marker && (
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 rounded-b-sm bg-lime transition-[translate,width] duration-200 ease-out"
            style={{ translate: `${marker.x}px`, width: marker.w }}
          />
        )}
        <ol className="flex px-4 md:grid md:grid-cols-6 md:px-6">
          {MONTH.map((d, i) => {
            const on = d.id === active;
            return (
              <li key={d.id} data-id={d.id} className={`min-w-32 shrink-0 snap-start md:min-w-0 ${i ? "border-l border-border" : ""}`}>
                <a
                  href={d.id === "bill" ? "#top" : `#${d.id}`}
                  onClick={() => setActive(d.id)}
                  aria-current={on ? "step" : undefined}
                  className={`relative flex h-full flex-col rounded-b-sm px-3 pb-2.5 pt-2 transition-colors duration-200 ease-out ${
                    on ? `text-on-lime ${marker ? "" : "bg-lime"}` : "hover:bg-surface-2"
                  }`}
                >
                  <span className="num text-small font-semibold uppercase">
                    {d.date}
                    {d.who && <span className="font-sans font-normal normal-case"> · {d.who}</span>}
                  </span>
                  <span className="text-small">{d.title}</span>
                </a>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
