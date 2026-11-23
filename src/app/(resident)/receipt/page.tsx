import Link from "next/link";
import { TriangleAlert, Lightbulb, ScanLine } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { BADGES, getAppliances, getBadges, getLatestBill, getScore, monthLabel } from "@/lib/data";
import { daysInPeriod, reconcile, swapTip } from "@/lib/scoring";
import { Notice, PageTitle, buttonStyles, kwh, peso, pct } from "@/components/ui";

export default async function ReceiptPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const viewer = await requireViewer("resident");
  const { saved } = await searchParams;
  const bill = await getLatestBill(viewer.householdId);

  if (!bill) {
    return (
      <>
        <PageTitle>Receipt</PageTitle>
        <div className="flex flex-col items-start gap-4 rounded-md border border-border bg-surface p-4">
          <p>Scan your electric bill to see where your money goes, appliance by appliance.</p>
          <Link href="/scan" className={buttonStyles.primary}>
            <ScanLine size={20} strokeWidth={1.75} aria-hidden />
            Scan your bill
          </Link>
        </div>
      </>
    );
  }

  const [appliances, score, badges] = await Promise.all([
    getAppliances(viewer.householdId),
    getScore(bill.id),
    getBadges(viewer.householdId),
  ]);
  const receipt = reconcile(
    appliances.map((a) => ({ id: a.id, label: a.label, type: a.type, watts: a.watts, hoursPerDay: a.hours_per_day, isInverter: a.is_inverter })),
    { kwh: bill.kwh, amountDue: bill.amount_due, days: daysInPeriod(bill.period_start, bill.period_end) },
  );
  const tips = receipt.lines.slice(0, 3).map(swapTip);

  return (
    <>
      <PageTitle sub={`${monthLabel(bill.score_month)} bill`}>Receipt</PageTitle>

      <div className="mb-4 flex flex-col gap-3">
        {saved === "approved" && <Notice tone="success">Bill saved. You are on this month&apos;s barangay ranking.</Notice>}
        {bill.status === "flagged" && (
          <Notice tone="warning">
            The barangay will check this bill before it counts on the ranking: {bill.flag_reasons.join("; ")}.
          </Notice>
        )}
        {bill.status === "rejected" && <Notice tone="error">The barangay could not verify this bill, so it is not on the ranking.</Notice>}
      </div>

      {score && (
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-md border border-border bg-surface p-4">
            <p className="text-small text-muted">Saved vs last year</p>
            <p className={`num text-amount-lg font-semibold ${score.savingsPct > 0 ? "text-primary" : ""}`}>{pct(score.savingsPct)}</p>
          </div>
          <div className="rounded-md border border-border bg-surface p-4">
            <p className="text-small text-muted">Ranking score</p>
            <p className="num text-amount-lg font-semibold">{pct(score.score)}</p>
          </div>
        </div>
      )}

      <article aria-label="Itemized receipt" className="rounded-md bg-surface p-4 shadow-receipt">
        <header className="border-b border-dashed border-border-strong pb-3 text-center">
          <p className="num font-semibold tracking-wide">{viewer.barangayName.toUpperCase()}</p>
          <p className="num text-small text-muted">
            {viewer.householdLabel} · {bill.period_start} to {bill.period_end}
          </p>
          <p className="num text-small text-muted">Rate {peso(receipt.rate)}/kWh</p>
        </header>

        {receipt.lines.length === 0 ? (
          <div className="py-6 text-center">
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
                  <span className="num block text-small text-muted">{kwh(l.kwh)} · {Math.round(l.share * 100)}%</span>
                </span>
                <span className="num font-semibold">{peso(l.pesos)}</span>
              </li>
            ))}
            {receipt.unaccounted && (
              <li className="flex items-baseline justify-between gap-3 py-2 text-warning">
                <span className="flex gap-2">
                  <TriangleAlert size={20} aria-hidden className="mt-0.5 shrink-0" />
                  <span>
                    Unaccounted
                    <span className="num block text-small">{kwh(receipt.unaccounted.kwh)} · {Math.round(receipt.unaccounted.share * 100)}%</span>
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
        <div className="mt-4">
          <Notice tone="warning">
            {Math.round(receipt.unaccounted.share * 100)}% of your bill is not explained by your appliances. Add any you missed. If it stays
            high, check for a ref with a worn door seal or devices left on standby, then switch everything off and see if the meter still moves.
          </Notice>
        </div>
      )}

      {tips.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-h2 font-semibold">What to change first</h2>
          <ul className="flex flex-col gap-3">
            {tips.map((t) => {
              const line = receipt.lines.find((l) => l.id === t.lineId)!;
              return (
                <li key={t.lineId} className="flex gap-3 rounded-md border border-border bg-surface p-4">
                  <Lightbulb size={20} strokeWidth={1.75} aria-hidden className="mt-0.5 shrink-0 text-primary" />
                  <div>
                    <p className="font-semibold">{line.label}</p>
                    <p>{t.text}</p>
                    <p className="num mt-1 text-small text-primary">
                      Saves about {peso(t.monthlySaving)}/month
                      {t.paybackMonths !== null && ` · pays for itself in ${t.paybackMonths} months`}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-small text-muted">Savings are estimates based on your bill&apos;s rate.</p>
        </section>
      )}

      {badges.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-h2 font-semibold">Badges</h2>
          <ul className="flex flex-wrap gap-2">
            {badges.map((b) => (
              <li key={b} title={BADGES[b]?.hint} className="rounded-sm bg-accent px-3 py-1 text-small font-semibold">
                {BADGES[b]?.label ?? b}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
