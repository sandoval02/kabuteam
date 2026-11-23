"use client";

import dynamic from "next/dynamic";
import { useReducedMotion } from "motion/react";
import { EXAMPLE_HOUSES, EXAMPLE_WINNER } from "./example-data";

// three.js only loads in the browser, after the page text is visible.
const BarangayScene = dynamic(() => import("./barangay-scene"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-md bg-border/40" />,
});

const BIGGEST = EXAMPLE_HOUSES.reduce((a, b) => (b.size > a.size ? b : a));

export function HeroScene() {
  const reduced = useReducedMotion() ?? false;
  return (
    <figure className="flex flex-col">
      <div className="h-80 w-full cursor-grab touch-pan-y active:cursor-grabbing md:h-110">
        <BarangayScene reduced={reduced} />
      </div>
      <figcaption className="text-small text-muted">
        Example barangay. Bar height = % saved vs the same month last year. {EXAMPLE_WINNER.label}, a small home, leads with{" "}
        {EXAMPLE_WINNER.score}%; the biggest house has {BIGGEST.score}%. Drag to look around.
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
