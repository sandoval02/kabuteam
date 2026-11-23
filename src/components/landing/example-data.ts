import { fairScore } from "@/lib/scoring";

// Illustrative households for the landing page. Scores use the app's real formula,
// so the demo shows exactly how the ranking works. Labelled "Example" in the UI.
const raw = [
  { label: "Bahay #014", size: 0.8, lastYear: 150, now: 117 },
  { label: "Bahay #032", size: 1.1, lastYear: 380, now: 342 },
  { label: "Bahay #007", size: 1.9, lastYear: 1000, now: 940 },
  { label: "Bahay #021", size: 0.6, lastYear: 62, now: 61 },
  { label: "Bahay #045", size: 1.3, lastYear: 420, now: 408 },
];

export const EXAMPLE_HOUSES = raw.map((h) => ({ ...h, ...fairScore(h.now, h.lastYear) }));
export const EXAMPLE_WINNER = EXAMPLE_HOUSES.reduce((a, b) => (b.score > a.score ? b : a));
