import Link from "next/link";
import { ArrowLeft, Award, Lightbulb, TriangleAlert } from "lucide-react";
import { redirect } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { BADGES, getAppliances, getBadges, getLatestBill, monthLabel } from "@/lib/data";
import { daysInPeriod, reconcile, swapTip } from "@/lib/scoring";
import { Card, IconTile, Notice, PageTitle, buttonStyles, kwh, peso } from "@/components/ui";

/** The full itemized receipt, every swap tip and badges. Home shows the summary. */
export default async function ReceiptPage() {
  const viewer = await requireViewer("resident");
  const bill = await getLatestBill(viewer.householdId);
  if (!bill) redirect("/home");

  const [appliances, badges] = await Promise.all([getAppliances(viewer.householdId), getBadges(viewer.householdId)]);
  const receipt = reconcile(
    appliances.map((a) => ({ id: a.id, label: a.label, type: a.type, watts: a.watts, hoursPerDay: a.hours_per_day, isInverter: a.is_inverter })),
    { kwh: bill.kwh, amountDue: bill.amount_due, days: daysInPeriod(bill.period_start, bill.period_end) },
  );
  const tips = receipt.lines.slice(0, 3).map(swapTip);

  return (
    <>
      <Link href="/home" className="mb-2 inline-flex h-9 items-center gap-1.5 text-small font-semibold text-muted hover:text-text">
        <ArrowLeft size={12} aria-hidden />
        Home
      </Link>
      <PageTitle sub={`${monthLabel(bill.score_month)} bill`}>Receipt</PageTitle>

      <article aria-label="Itemized receipt" className="rounded-md bg-surface p-4 shadow-receipt">
        <header className="border-b border-dashed border-border-strong pb-3 text-center">
          <p className="num font-semibold tracking-wide">{viewer.barangayName.toUpperCase()}</p>
          <p className="num text-small text-muted">
            {viewer.householdLabel} · {bill.period_start} to {bill.period_end}
          </p>
          <p className="num text-small text-muted">Rate {peso(receipt.rate)}/kWh</p>
        </header>

        {receipt.lines.length === 0 ? (
          <div className="py-5 text-center">
            <p className="text-muted">Add your appliances to break this bill down.</p>
            <Link href="/scan" className={`${buttonStyles.secondary} mt-3`}>
              Add appliances
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-dashed divide-border py-1">
            {receipt.lines.map((l) => (
              <li key={l.id} className="flex items-baseline justify-between gap-3 py-2">
                <span>
                  {l.label}
                  <span className="num block text-small text-muted">
                    {kwh(l.kwh)} · {Math.round(l.share * 100)}%
                  </span>
                </span>
                <span className="num font-semibold">{peso(l.pesos)}</span>
              </li>
            ))}
            {receipt.unaccounted && (
              <li className="flex items-baseline justify-between gap-3 py-2 text-warning">
                <span className="flex gap-2">
                  <TriangleAlert size={14} aria-hidden className="mt-0.5 shrink-0" />
                  <span>
                    Unaccounted
                    <span className="num block text-small">
                      {kwh(receipt.unaccounted.kwh)} · {Math.round(receipt.unaccounted.share * 100)}%
                    </span>
                  </span>
                </span>
                <span className="num font-semibold">{peso(receipt.unaccounted.pesos)}</span>
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
      {receipt.unaccounted && (
        <div className="mt-3">
          <Notice tone="warning">
            {Math.round(receipt.unaccounted.share * 100)}% of your bill is not explained by your appliances. Add any you missed. If it stays high,
            check for a ref with a worn door seal or devices left on standby, then switch everything off and see if the meter still moves.
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
              return (
                <li key={t.lineId}>
                  <Card className="flex gap-3">
                    <IconTile icon={Lightbulb} tone="gold" />
                    <div className="min-w-0">
                      <p className="font-semibold">{line.label}</p>
                      <p className="text-small text-muted">{t.text}</p>
                      <p className="num mt-1.5 inline-flex flex-wrap gap-x-2 rounded-full bg-primary-soft px-2.5 py-0.5 text-small font-semibold">
                        <span>Saves about {peso(t.monthlySaving)}/month</span>
                        {t.paybackMonths !== null && <span>· pays back in {t.paybackMonths} months</span>}
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
