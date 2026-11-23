import type { HistoryEntry } from "@/lib/scoring";

const shift = (month: string, d: number) => {
  const [y, m] = month.split("-").map(Number);
  const x = new Date(Date.UTC(y, m - 1 + d, 1));
  return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, "0")}`;
};
const short = (month: string) =>
  new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-PH", { month: "short", timeZone: "UTC" });

/** 13 months ending at the bill month: this month in bright green, the same month last year in gold. */
export function UsageChart({ history, month, kwh }: { history: HistoryEntry[]; month: string; kwh: number }) {
  const lastYear = shift(month, -12);
  const byMonth = new Map(history.map((h) => [h.month, h.kwh]));
  byMonth.set(month, kwh);
  const months = Array.from({ length: 13 }, (_, i) => shift(month, i - 12));
  const bars = months.map((m) => ({ m, v: byMonth.get(m) ?? null }));
  const max = Math.max(...bars.map((b) => b.v ?? 0), 1);
  const known = bars.filter((b) => b.v !== null).length;

  if (known < 2) {
    return <p className="text-small text-muted">Your bill&apos;s usage chart will appear here once a bill with monthly history is scanned.</p>;
  }

  return (
    <figure>
      <div className="flex h-40 items-end gap-1.5" aria-hidden>
        {bars.map(({ m, v }) => {
          const isNow = m === month;
          const isLastYear = m === lastYear;
          return (
            <div key={m} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
              {(isNow || isLastYear) && v !== null && <span className="num text-[0.7rem] font-semibold">{Math.round(v)}</span>}
              <div
                className={`w-full rounded-t-[6px] ${isNow ? "bg-primary" : isLastYear ? "bg-green" : "bg-green/25"}`}
                style={{ height: v === null ? 2 : `${Math.max(4, (v / max) * 100)}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex gap-1.5 text-center text-[0.65rem] text-muted" aria-hidden>
        {bars.map(({ m }, i) => (
          <span key={m} className="flex-1">
            {i % 3 === 0 || m === month ? short(m) : ""}
          </span>
        ))}
      </div>
      <figcaption className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-small text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[4px] bg-primary" aria-hidden /> This month
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[4px] bg-green" aria-hidden /> Same month last year
        </span>
      </figcaption>
      <table className="sr-only">
        <caption>Monthly electricity use, kWh</caption>
        <tbody>
          {bars
            .filter((b) => b.v !== null)
            .map((b) => (
              <tr key={b.m}>
                <th scope="row">{short(b.m)} {b.m.slice(0, 4)}</th>
                <td>{b.v} kWh</td>
              </tr>
            ))}
        </tbody>
      </table>
    </figure>
  );
}
