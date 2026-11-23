import { Award } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { BADGES, getLeaderboard, monthLabel } from "@/lib/data";
import { Notice, PageTitle, pct } from "@/components/ui";

export default async function RankingPage() {
  const viewer = await requireViewer("resident");
  const { month, rows } = await getLeaderboard(viewer.barangayId);
  const mine = rows.findIndex((r) => r.householdId === viewer.householdId);

  return (
    <>
      <PageTitle sub={month ? `${viewer.barangayName} · ${monthLabel(month)} bills` : viewer.barangayName}>Ranking</PageTitle>
      <p className="mb-4 text-small text-muted">
        Ranked by % saved against your own usage last year, so a small house can beat a big one. Households using 100 kWh or less score at least
        15%.
      </p>

      {rows.length < 2 ? (
        <Notice tone="info">
          {rows.length === 1 && mine === 0
            ? "You're the first! The ranking starts when neighbors scan their bills."
            : "No ranking yet this month. It starts when two households have scanned their bills."}
        </Notice>
      ) : (
        <ol className="divide-y divide-border rounded-md bg-surface shadow-receipt">
          {rows.map((r, i) => {
            const isMe = i === mine;
            return (
              <li
                key={r.householdId}
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
                          {BADGES[b]?.label ?? b}
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
      )}
    </>
  );
}
