"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { TriangleAlert } from "lucide-react";
import { peso } from "@/components/ui";

gsap.registerPlugin(ScrollTrigger, useGSAP);

// Example bill: 250 kWh, ₱3,140. The lines add up to the total, like the real app.
const LINES = [
  { label: "Aircon", kwh: 120, pesos: 1507.2 },
  { label: "Refrigerator", kwh: 45, pesos: 565.2 },
  { label: "Electric fan", kwh: 18, pesos: 226.08 },
  { label: "TV", kwh: 12, pesos: 150.72 },
];
const UNACCOUNTED = { kwh: 55, pesos: 690.8 };

const STEPS = [
  { title: "Scan your Meralco bill", body: "AI reads the kWh, amount and the 12-month chart. You check every number." },
  { title: "Scan your appliance stickers", body: "The rating label gives the watts. You set the hours you use it." },
  { title: "Get your receipt", body: "Each appliance gets a peso amount, and the lines add up to your real bill." },
];

export function PrintingReceipt() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      // Only animate when motion is allowed; otherwise the receipt is simply shown.
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({
          scrollTrigger: { trigger: root.current, start: "top 70%", end: "bottom 60%", scrub: 0.6 },
        });
        // Text keeps full contrast throughout: the paper unrolls, and step numbers fill in.
        tl.from("[data-paper]", { clipPath: "inset(0 0 100% 0)", ease: "none", duration: 1 })
          .from("[data-line]", { y: -10, stagger: 0.25, duration: 0.3 }, 0.2)
          .to("[data-step-num]", { backgroundColor: "#c6f432", borderColor: "#c6f432", color: "#0a0a0a", stagger: 0.4, duration: 0.2 }, 0);
      });
    },
    { scope: root },
  );

  return (
    <div ref={root} className="grid items-center gap-10 md:grid-cols-2">
      <ol className="flex flex-col gap-6">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex gap-4">
            <span data-step-num className="num flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-border-strong font-semibold">
              {i + 1}
            </span>
            <div>
              <h3 className="text-h2 font-semibold">{s.title}</h3>
              <p className="mt-1 text-muted">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <figure className="mx-auto w-full max-w-sm">
        <div data-paper className="rounded-md bg-surface p-5 shadow-receipt">
          <header className="border-b border-dashed border-border-strong pb-3 text-center">
            <p className="num font-semibold tracking-wide">BAHAY #014</p>
            <p className="num text-small text-muted">Oct 2026 · ₱12.56/kWh</p>
          </header>
          <ul className="divide-y divide-dashed divide-border py-1">
            {LINES.map((l) => (
              <li key={l.label} data-line className="flex items-baseline justify-between gap-3 py-2">
                <span>
                  {l.label}
                  <span className="num block text-small text-muted">{l.kwh} kWh</span>
                </span>
                <span className="num font-semibold">{peso(l.pesos)}</span>
              </li>
            ))}
            <li data-line className="flex items-baseline justify-between gap-3 py-2 text-warning">
              <span className="flex gap-2">
                <TriangleAlert size={15} aria-hidden className="mt-0.5 shrink-0" />
                <span>
                  Unaccounted
                  <span className="num block text-small">{UNACCOUNTED.kwh} kWh · 22%</span>
                </span>
              </span>
              <span className="num font-semibold">{peso(UNACCOUNTED.pesos)}</span>
            </li>
          </ul>
          <footer data-line className="flex items-baseline justify-between border-t border-dashed border-border-strong pt-3">
            <span className="font-semibold">TOTAL · 250 kWh</span>
            <span className="num text-amount-lg font-semibold">{peso(3140)}</span>
          </footer>
        </div>
        <figcaption className="mt-3 text-small text-muted">
          Example receipt. The Unaccounted line is power your appliances can&apos;t explain: a worn ref seal, standby devices, or a leak.
        </figcaption>
      </figure>
    </div>
  );
}
