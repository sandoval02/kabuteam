import { Trophy, Users } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { BADGES, getLeaderboard, monthLabel } from "@/lib/data";
import { CardSection, Notice, PageHero } from "@/components/ui";
import { RankingList } from "./ranking-list";

export const metadata = { title: "Ranking · Kuryentipid" };

export default async function RankingPage() {
  const viewer = await requireViewer("resident");
  const { month, rows } = await getLeaderboard(viewer.barangayId);
  const mine = rows.findIndex((r) => r.householdId === viewer.householdId);
  const monthName = month ? monthLabel(month) : null;
  const badgeLabels = Object.fromEntries(Object.entries(BADGES).map(([code, badge]) => [code, badge.label]));

  return (
    <>
      <PageHero icon={Trophy} title="Ranking" sub={month ? `${viewer.barangayName} · ${monthLabel(month)} bills` : viewer.barangayName} />
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
