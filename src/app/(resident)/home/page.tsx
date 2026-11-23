import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  Camera,
  ChevronRight,
  Lightbulb,
  ListChecks,
  Plug,
  ReceiptText,
  TriangleAlert,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { APPLIANCE_TYPES, type ApplianceType } from "@/lib/extraction/schemas";
import { getAppliances, getLatestBill, getLeaderboard, getScore, monthLabel } from "@/lib/data";
import { UNACCOUNTED_THRESHOLD, daysInPeriod, reconcile, swapTip } from "@/lib/scoring";
import { Notice, kwh, peso, pct } from "@/components/ui";
import { UsageChart } from "@/components/usage-chart";
import { Sparkline } from "@/components/sparkline";
import { Tabs } from "@/components/tabs";
import { ToastFromParam } from "@/components/form";

const SAVED_TOASTS = {
  approved: { text: "Bill saved. You're on this month's barangay ranking." },
  flagged: { text: "Bill saved. The barangay will check it before it counts.", tone: "warning" as const },
};

/** Round lime action with a label underneath (wallet "Send / Receive" row). */
function Action({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  return (
    <Link href={href} className="flex flex-col items-center gap-1.5 text-small font-semibold">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-lime text-on-lime transition-transform duration-100 active:scale-95">
        <Icon size={18} strokeWidth={2} aria-hidden />
      </span>
      {label}
    </Link>
  );
}

function Actions({ hasBill }: { hasBill: boolean }) {
  return (
    <nav aria-label="Quick actions" className="mt-5 grid grid-cols-4">
      <Action href="/scan" icon={Camera} label={hasBill ? "Scan bill" : "Scan"} />
      <Action href="/scan#appliances" icon={Plug} label="Appliances" />
      <Action href={hasBill ? "/receipt" : "/scan"} icon={ReceiptText} label="Receipt" />
      <Action href="/ranking" icon={Trophy} label="Ranking" />
    </nav>
  );
}

/** One wallet-style list row: round icon, name + detail, value + sub-value on the right. */
function Row({
  icon: Icon,
  tone = "plain",
  title,
  detail,
  value,
  sub,
  share,
}: {
  icon: LucideIcon;
  tone?: "plain" | "warning";
  title: string;
  detail: string;
  value: string;
  sub?: string;
  /** Share of the bill, 0–1: shown as a chip next to `sub`. */
  share?: number;
}) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span
        aria-hidden
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tone === "warning" ? "bg-warning-bg text-warning" : "bg-surface-2 text-text"}`}
      >
        <Icon size={15} strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-small font-semibold ${tone === "warning" ? "text-warning" : ""}`}>{title}</span>
        <span className="block text-small text-muted">{detail}</span>
      </span>
      <span className="shrink-0 text-right">
        <span className="num block text-small font-semibold">{value}</span>
        {(sub || share !== undefined) && (
          <span className="mt-0.5 flex items-center justify-end gap-1.5 text-small">
            {sub && <span className="num text-muted">{sub}</span>}
            {share !== undefined && (
              <span className={`num rounded-sm px-1.5 font-semibold ${tone === "warning" ? "bg-warning-bg text-warning" : "bg-lime text-on-lime"}`}>
                {Math.round(share * 100)}%
              </span>
            )}
          </span>
        )}
      </span>
    </li>
  );
}

export default async function HomePage() {
  const viewer = await requireViewer("resident");
  const [bill, board, appliances] = await Promise.all([
    getLatestBill(viewer.householdId),
    getLeaderboard(viewer.barangayId),
    getAppliances(viewer.householdId),
  ]);

  if (!bill) {
    return (
      <>
        <ToastFromParam param="saved" messages={SAVED_TOASTS} />
        <section className="flex flex-col items-center pt-2 text-center">
          <p className="text-small text-muted">Your electric bill</p>
          <p className="num mt-0.5 text-[2.25rem] font-semibold leading-tight">₱—</p>
          <p className="text-small text-muted">
            {board.rows.length ? `${board.rows.length} households ranked in ${viewer.barangayName}. Scan to join.` : "Scan your first bill to get started."}
          </p>
        </section>
        <Actions hasBill={false} />
        <div className="mt-6 rounded-md bg-surface p-3.5 shadow-receipt">
          <Tabs
            tabs={[
              {
                id: "start",
                label: "Get started",
                content: (
                  <ul className="divide-y divide-border">
                    {[
                      { icon: Camera, title: "Photograph your bill", sub: "AI reads it; you check every number" },
                      { icon: ListChecks, title: "Add your appliances", sub: "Scan the sticker or pick from a list" },
                      { icon: ReceiptText, title: "Get your receipt", sub: "A peso amount for each appliance" },
                    ].map(({ icon: Icon, title, sub }) => (
                      <li key={title}>
                        <Link href="/scan" className="flex items-center gap-3 py-2.5">
                          <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2">
                            <Icon size={15} strokeWidth={1.75} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold">{title}</span>
                            <span className="block text-small text-muted">{sub}</span>
                          </span>
                          <ChevronRight size={15} className="text-muted" aria-hidden />
                        </Link>
                      </li>
                    ))}
                  </ul>
                ),
              },
            ]}
          />
        </div>
      </>
    );
  }

  const score = await getScore(bill.id);
  const rankIndex = board.month === bill.score_month ? board.rows.findIndex((r) => r.householdId === viewer.householdId) : -1;
  const receipt = reconcile(
    appliances.map((a) => ({ id: a.id, label: a.label, type: a.type, watts: a.watts, hoursPerDay: a.hours_per_day, isInverter: a.is_inverter })),
    { kwh: bill.kwh, amountDue: bill.amount_due, days: daysInPeriod(bill.period_start, bill.period_end) },
  );
  const tips = receipt.lines.slice(0, 3).map(swapTip);
  const saving = score?.savingsPct ?? null;
  const baseline = score?.baseline ?? null;
  const trend = [...bill.history.map((h) => h.kwh), bill.kwh].slice(-13);
  const typeLabel = (t: string) => APPLIANCE_TYPES[t as ApplianceType]?.label ?? t;

  return (
    <>
      <ToastFromParam param="saved" messages={SAVED_TOASTS} />
      {bill.status !== "approved" && (
        <div className="mb-2">
          <Notice tone={bill.status === "flagged" ? "warning" : "error"}>
            {bill.status === "flagged" ? (
              <details className="group">
                <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  The barangay will check this bill before it counts.{" "}
                  <span className="font-semibold underline underline-offset-4">
                    <span className="group-open:hidden">Why? ({bill.flag_reasons.length})</span>
                    <span className="hidden group-open:inline">Hide</span>
                  </span>
                </summary>
                <ul className="mt-1.5 list-disc pl-4">
                  {bill.flag_reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </details>
            ) : (
              "The barangay could not verify this bill, so it is not on the ranking."
            )}
          </Notice>
        </div>
      )}

      <section className="flex flex-col items-center gap-2 pt-2 text-center">
        <div className="min-w-0">
          <p className="text-small text-muted">Amount due · {monthLabel(bill.score_month)}</p>
          <p className="num mt-0.5 text-[2.25rem] font-semibold leading-tight">{peso(bill.amount_due)}</p>
          <p className="num flex flex-wrap items-center justify-center gap-x-1.5 text-small">
            {saving !== null && baseline !== null ? (
              <span className={`inline-flex items-center font-semibold ${saving >= 0 ? "text-success" : "text-warning"}`}>
                {saving >= 0 ? <ArrowDownRight size={14} aria-hidden /> : <ArrowUpRight size={14} aria-hidden />}
                {pct(Math.abs(saving))} {saving >= 0 ? "less" : "more"} than last year
              </span>
            ) : (
              <span className="text-muted">{kwh(bill.kwh)}</span>
            )}
            {rankIndex >= 0 && (
              <span className="text-muted">
                · #{rankIndex + 1} of {board.rows.length}
              </span>
            )}
          </p>
        </div>
        <Sparkline values={trend} className="h-12 w-28 shrink-0 text-primary-bright" />
      </section>

      <Actions hasBill />

      <div className="mt-6 rounded-md bg-surface p-3.5 shadow-receipt">
        <Tabs
          tabs={[
            {
              id: "costs",
              label: "Costs",
              content: (
                <>
                  <div className="flex items-center justify-between rounded-sm bg-surface-2 px-3 py-2.5 text-small">
                    <span className="text-muted">Total this bill · {kwh(bill.kwh)}</span>
                    <span className="num font-semibold">{peso(bill.amount_due)}</span>
                  </div>
                  {receipt.lines.length === 0 ? (
                    <Link href="/scan#appliances" className="mt-2 flex items-center gap-3 py-2.5">
                      <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2">
                        <Plug size={15} strokeWidth={1.75} />
                      </span>
                      <span className="flex-1 font-semibold">Add appliances to see where the money goes</span>
                      <ChevronRight size={15} className="text-muted" aria-hidden />
                    </Link>
                  ) : (
                    <ul className="divide-y divide-border">
                      {receipt.lines.map((l) => (
                        <Row
                          key={l.id}
                          icon={Plug}
                          title={l.label}
                          detail={`${typeLabel(l.type)} · ${l.hoursPerDay} h/day`}
                          value={peso(l.pesos)}
                          sub={kwh(l.kwh)}
                          share={l.share}
                        />
                      ))}
                      {receipt.unaccounted && (
                        <Row
                          icon={TriangleAlert}
                          tone={receipt.unaccounted.share > UNACCOUNTED_THRESHOLD ? "warning" : "plain"}
                          title="Unaccounted"
                          detail="Not explained by your appliances"
                          value={peso(receipt.unaccounted.pesos)}
                          sub={kwh(receipt.unaccounted.kwh)}
                          share={receipt.unaccounted.share}
                        />
                      )}
                    </ul>
                  )}
                  <Link href="/receipt" className="mt-1 flex items-center justify-center gap-1 py-2 text-small font-semibold">
                    Full receipt
                    <ChevronRight size={14} aria-hidden />
                  </Link>
                </>
              ),
            },
            {
              id: "usage",
              label: "Usage",
              content: <UsageChart history={bill.history} month={bill.score_month} kwh={bill.kwh} />,
            },
            {
              id: "tips",
              label: "Tips",
              content: tips.length ? (
                <ul className="divide-y divide-border">
                  {tips.map((t) => {
                    const line = receipt.lines.find((l) => l.id === t.lineId)!;
                    return (
                      <Row
                        key={t.lineId}
                        icon={Lightbulb}
                        title={line.label}
                        detail={t.text}
                        value={`${peso(t.monthlySaving)}/mo`}
                        sub={t.paybackMonths !== null ? `${t.paybackMonths} mo payback` : undefined}
                      />
                    );
                  })}
                </ul>
              ) : (
                <p className="py-2.5 text-small text-muted">Add your appliances to get tips.</p>
              ),
            },
          ]}
        />
      </div>
    </>
  );
}
