import Link from "next/link";
import { ScanLine, Users } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { BADGES, getLeaderboard, monthLabel } from "@/lib/data";
import { CardSection, Notice, buttonStyles, pct } from "@/components/ui";
import { RankingList } from "./ranking-list";

export default async function RankingPage() {
  const viewer = await requireViewer("resident");
  const { month, rows } = await getLeaderboard(viewer.barangayId);
  const mine = rows.findIndex((r) => r.householdId === viewer.householdId);
  const monthName = month ? monthLabel(month) : null;
  const badgeLabels = Object.fromEntries(Object.entries(BADGES).map(([code, badge]) => [code, badge.label]));

  return (
    <>
      <h1 className="sr-only">Ranking</h1>
      <RankHero rows={rows} mine={mine} monthName={monthName} barangay={viewer.barangayName} />
      <CardSection title="Households" icon={Users}>
        <p className="mb-3 text-small text-muted">
          Ranked by % saved against your own usage last year, so a small house can beat a big one. Households using 100 kWh or less score at least
          15%.
        </p>

        {rows.length < 2 ? (
          <Notice tone="info">
            {rows.length === 1 && mine === 0
              ? `You're the first for ${monthName ?? "this month"}! The ranking starts when neighbors scan their bills.`
              : monthName
                ? `Only one household has a scored ${monthName} bill. The ranking starts when two households have one.`
                : "No ranking yet. It starts when two households have scanned their bills."}
          </Notice>
        ) : (
          <RankingList rows={rows} mine={mine} badgeLabels={badgeLabels} />
        )}
      </CardSection>
    </>
  );
}

type Row = Awaited<ReturnType<typeof getLeaderboard>>["rows"][number];

/** Lime hero with the viewer's real standing; a scan prompt when they aren't on this month's ranking. */
function RankHero({ rows, mine, monthName, barangay }: { rows: Row[]; mine: number; monthName: string | null; barangay: string }) {
  const where = monthName ? `${barangay} · ${monthName} bills` : barangay;
  if (mine < 0) {
    return (
      <section className="mb-3 rounded-lg bg-lime p-5 text-on-lime">
        <p className="text-small">{where}</p>
        <p className="mt-1 font-display text-h2 font-semibold">{monthName ? `You're not ranked for ${monthName} yet` : "No ranking yet"}</p>
        <p className="mt-1 text-small">
          {rows.length ? `${rows.length} ${rows.length === 1 ? "household is" : "households are"} on the ranking. Scan your bill to join.` : "Scan your bill to be the first."}
        </p>
        <Link href="/scan" className={`${buttonStyles.primary} mt-4 w-full`}>
          <ScanLine size={16} strokeWidth={1.75} aria-hidden />
          Scan your bill
        </Link>
      </section>
    );
  }

  const me = rows[mine];
  const ahead = mine > 0 ? rows[mine - 1] : null;
  const stats = [
    { label: "Fair score", value: pct(me.score) },
    { label: "Saved vs last year", value: pct(me.savingsPct) },
    ahead
      ? { label: `Behind #${mine}`, value: `${Math.max(0, ahead.score - me.score).toFixed(1)} pts` }
      : { label: "Lead over #2", value: rows[1] ? `${Math.max(0, me.score - rows[1].score).toFixed(1)} pts` : "—" },
  ];

  return (
    <section className="mb-3 rounded-lg bg-lime p-5 text-on-lime">
      <p className="text-small">{where}</p>
      <p className="mt-1 flex items-baseline gap-2">
        <span className="num text-[2.25rem] font-semibold leading-tight">#{mine + 1}</span>
        <span className="font-semibold">
          of {rows.length} {rows.length === 1 ? "household" : "households"}
        </span>
      </p>
      <dl className="mt-4 grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="min-w-0">
            <dt className="text-small">{s.label}</dt>
            <dd className="num text-h2 font-semibold">{s.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
