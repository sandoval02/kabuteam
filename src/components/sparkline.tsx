/** Tiny usage trend (wallet style). Lime area fill for the accent; the line and dot draw in currentColor (lime alone fails 3:1 on white). Decorative; values are elsewhere. */
export function Sparkline({ values, className = "" }: { values: number[]; className?: string }) {
  if (values.length < 2) return null;
  const w = 120;
  const h = 48;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 4 - ((v - min) / span) * (h - 8)]);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} aria-hidden fill="none">
      <path d={`${d} L${w} ${h} L0 ${h} Z`} fill="var(--color-lime)" opacity="0.55" />
      <path d={d} stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r="4.5" fill="var(--color-lime)" stroke="currentColor" strokeWidth="2.5" />
    </svg>
  );
}
