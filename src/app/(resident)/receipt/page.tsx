import Link from "next/link";
import { ArrowDownRight, ArrowLeft, ArrowUpRight, Award, Lightbulb, TriangleAlert } from "lucide-react";
import { redirect } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { BADGES, getAppliances, getBadges, getLatestBill, getScore, monthLabel } from "@/lib/data";
import { UNACCOUNTED_THRESHOLD, daysInPeriod, reconcile, swapTip } from "@/lib/scoring";
import { ToastFromParam } from "@/components/form";
import { Card, IconTile, Notice, PageTitle, buttonStyles, kwh, paybackText, pct, peso } from "@/components/ui";

export const metadata = { title: "Receipt · Kuryentipid" };

const SAVED_TOASTS = {
  approved: { text: "Bill saved. Here's your receipt." },
  flagged: { text: "Bill saved. The barangay will check it before it counts.", tone: "warning" as const },
};

const dayLabel = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-PH", { month: "short", day: "numeric", timeZone: "UTC" });

function periodLabel(start: string, end: string) {
  return `${dayLabel(start)} – ${dayLabel(end)}, ${end.slice(0, 4)}`;
}

/** The full itemized receipt, every swap tip and badges. Home shows the summary. */
export default async function ReceiptPage() {
  const viewer = await requireViewer("resident");
  const bill = await getLatestBill(viewer.householdId);
  if (!bill) redirect("/home");

  const [appliances, badges, score] = await Promise.all([
    getAppliances(viewer.householdId),
    getBadges(viewer.householdId),
    getScore(bill.id),
  ]);
  const receipt = reconcile(
    appliances.map((a) => ({ id: a.id, label: a.label, type: a.type, watts: a.watts, hoursPerDay: a.hours_per_day, isInverter: a.is_inverter })),
    { kwh: bill.kwh, amountDue: bill.amount_due, days: daysInPeriod(bill.period_start, bill.period_end) },
  );
  const tips = receipt.lines.slice(0, 3).map(swapTip);
  const saving = score?.savingsPct ?? null;
  const baseline = score?.baseline ?? null;
  const scoreValue = score?.score ?? null;
  const reasons = bill.flag_reasons.length ? ` ${bill.flag_reasons.join("; ")}.` : "";
  const floorApplied = scoreValue !== null && saving !== null && scoreValue > saving + 0.05;

  return (
    <>
      <ToastFromParam param="saved" messages={SAVED_TOASTS} />
      <Link href="/home" className="mb-2 inline-flex min-h-11 items-center gap-1.5 text-small font-semibold text-muted hover:text-text">
        <ArrowLeft size={12} aria-hidden />
        Home
      </Link>
      <PageTitle sub={`${monthLabel(bill.score_month)} bill`}>Receipt</PageTitle>

      {bill.status !== "approved" && (
        <div className="mb-3">
          <Notice tone={bill.status === "flagged" ? "warning" : "error"}>
            {bill.status === "flagged"
              ? `The barangay will check this bill before it counts.${reasons}`
              : `The barangay could not verify this bill, so it is not on the ranking.${reasons} You can scan a corrected bill for the same month.`}
          </Notice>
        </div>
      )}

      <div className="mb-3 flex items-center justify-between gap-3 rounded-sm bg-surface px-3 py-2.5 shadow-receipt">
        <div className="min-w-0">
          <p className="text-small text-muted">This bill</p>
          <p className="num mt-0.5 font-semibold">
            {kwh(bill.kwh)} · {peso(bill.amount_due)}
          </p>
        </div>
        {saving !== null && baseline !== null ? (
          <div className="shrink-0 text-right">
            <p className={`num inline-flex items-center gap-1 font-semibold ${saving >= 0 ? "text-success" : "text-warning"}`}>
              {saving >= 0 ? <ArrowDownRight size={14} aria-hidden /> : <ArrowUpRight size={14} aria-hidden />}
              {pct(Math.abs(saving))} {saving >= 0 ? "less" : "more"} than last year
            </p>
            <p className="text-small text-muted">Same month last year · {kwh(baseline)}</p>
            {floorApplied && scoreValue !== null && <p className="text-small text-muted">Score {pct(scoreValue)} · low-usage floor</p>}
          </div>
        ) : (
          <p className="shrink-0 text-right text-small text-muted">
            {scoreValue !== null
              ? `Score ${pct(scoreValue)}`
              : bill.status === "approved"
                ? "Not scored yet"
                : "Waiting for review"}
          </p>
        )}
      </div>

      <article aria-label="Itemized receipt" className="rounded-md bg-surface p-4 shadow-receipt">
        <header className="border-b border-dashed border-border-strong pb-3 text-center">
          <p className="num font-semibold tracking-wide">{viewer.barangayName.toUpperCase()}</p>
          <p className="num text-small text-muted">
            {viewer.householdLabel} · {periodLabel(bill.period_start, bill.period_end)}
          </p>
          <p className="num text-small text-muted">Rate {peso(receipt.rate)}/kWh</p>
        </header>

        {receipt.lines.length === 0 ? (
          <div className="py-5 text-center">
            <p className="text-muted">Add your appliances to break this bill down.</p>
            <Link href="/scan#appliances" className={`${buttonStyles.secondary} mt-3`}>
              Add appliances
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-dashed divide-border py-1">
            {receipt.lines.map((l) => (
              <li key={l.id} className="flex items-baseline justify-between gap-3 py-2">
                <span className="min-w-0 break-words">
                  {l.label}
                  <span className="num block text-small text-muted">
                    {kwh(l.kwh)} · {Math.round(l.share * 100)}%
                  </span>
                </span>
                <span className="num shrink-0 font-semibold">{peso(l.pesos)}</span>
              </li>
            ))}
            {receipt.unaccounted && (
              <li className="flex items-baseline justify-between gap-3 py-2 text-warning">
                <span className="flex min-w-0 gap-2">
                  <TriangleAlert size={14} aria-hidden className="mt-0.5 shrink-0" />
                  <span className="min-w-0 break-words">
                    Unaccounted
                    <span className="num block text-small">
                      {kwh(receipt.unaccounted.kwh)} · {Math.round(receipt.unaccounted.share * 100)}%
                    </span>
                  </span>
                </span>
                <span className="num shrink-0 font-semibold">{peso(receipt.unaccounted.pesos)}</span>
              </li>
            )}
          </ul>
        )}

        <footer className="flex items-baseline justify-between border-t border-dashed border-border-strong pt-3">
          <span className="font-semibold">TOTAL · {kwh(receipt.totalKwh)}</span>
          <span className="num text-amount-lg font-semibold">{peso(receipt.totalPesos)}</span>
        </footer>
      </article>
      {receipt.scaledDown && (
        <p className="mt-2 text-small text-muted">Your hours added up to more than the bill, so each line was scaled down to match it.</p>
      )}
      {receipt.unaccounted && receipt.unaccounted.share > UNACCOUNTED_THRESHOLD && (
        <div className="mt-3">
          <Notice tone="warning">
            {Math.round(receipt.unaccounted.share * 100)}% of your bill is not explained by your appliances. Add any you missed. If it stays high,
            check for a ref with a worn door seal or devices left on standby, then switch everything off and see if the meter still moves.{" "}
            <Link href="/scan#room" className="font-semibold underline">
              Room check
            </Link>{" "}
            can spot what was left on.
          </Notice>
        </div>
      )}

      {tips.length > 0 && (
        <section aria-labelledby="tips-title" className="mt-6">
          <h2 id="tips-title" className="mb-2.5 text-h2 font-semibold">
            What to change first
          </h2>
          <ul className="flex flex-col gap-2.5">
            {tips.map((t) => {
              const line = receipt.lines.find((l) => l.id === t.lineId)!;
              const payback = paybackText(t.paybackMonths);
              return (
                <li key={t.lineId}>
                  <Card className="flex gap-3">
                    <IconTile icon={Lightbulb} tone="gold" />
                    <div className="min-w-0">
                      <p className="break-words font-semibold">{line.label}</p>
                      <p className="text-small text-muted">{t.text}</p>
                      <p className="num mt-1.5 inline-flex flex-wrap gap-x-2 rounded-full bg-primary-soft px-2.5 py-0.5 text-small font-semibold">
                        <span>Saves about {peso(t.monthlySaving)}/month</span>
                        {payback && <span>· pays back in {payback}</span>}
                      </p>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-small text-muted">Savings are estimates based on your bill&apos;s rate.</p>
        </section>
      )}

      {badges.length > 0 && (
        <section aria-labelledby="badges-title" className="mt-6">
          <h2 id="badges-title" className="mb-2.5 text-h2 font-semibold">
            Badges
          </h2>
          <ul className="grid grid-cols-2 gap-2.5">
            {badges.map((b) => (
              <li key={b}>
                <Card className="flex h-full items-start gap-2.5 p-3">
                  <IconTile icon={Award} tone="gold" />
                  <span>
                    <span className="block font-semibold">{BADGES[b]?.label ?? b}</span>
                    <span className="block text-small text-muted">{BADGES[b]?.hint}</span>
                  </span>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
