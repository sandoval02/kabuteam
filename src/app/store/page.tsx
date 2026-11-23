import { Clock, QrCode } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { ValidatedForm } from "@/components/form";
import { SubmitButton } from "@/components/submit-button";
import { Field, Notice, PageTitle, Section, buttonStyles, peso } from "@/components/ui";
import { PAYOUT_METHODS } from "@/lib/validation";
import { respondPayout } from "./actions";
import { RedeemForm } from "./redeem-form";

export const metadata = { title: "Store · Kuryentipid" };

type Payout = {
  id: string;
  amount: number;
  voucher_count: number;
  method: keyof typeof PAYOUT_METHODS;
  reference: string;
  paid_at: string;
  status: "pending" | "confirmed" | "disputed";
  store_note: string | null;
};
type Voucher = { code: string; amount: number; redeemed_at: string; payout_id: string | null };

const VOUCHER_STATE = {
  unpaid: { label: "Unpaid", tone: "text-muted" },
  pending: { label: "Pending", tone: "text-text" },
  confirmed: { label: "Paid", tone: "text-success" },
  disputed: { label: "Disputed", tone: "text-warning" },
};
const PAYOUT_STATE = {
  pending: { label: "Waiting for you", tone: "text-text" },
  confirmed: { label: "Confirmed", tone: "text-success" },
  disputed: { label: "Not received", tone: "text-warning" },
};
const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-PH", { dateStyle: "medium", timeZone: "Asia/Manila" });

export default async function StorePage() {
  const viewer = await requireViewer("store");
  const admin = createAdminClient();
  const { data: store, error: storeError } = await admin
    .from("stores")
    .select("id, name, approved_at")
    .eq("owner_profile_id", viewer.userId)
    .maybeSingle();
  if (storeError) throw new Error(`Could not load the store: ${storeError.message}`);

  const [{ data: redeemedRaw, error: redeemedError }, { data: payoutsRaw, error: payoutsError }] = store
    ? await Promise.all([
        admin
          .from("vouchers")
          .select("code, amount, redeemed_at, payout_id")
          .eq("store_id", store.id)
          .not("redeemed_at", "is", null)
          .order("redeemed_at", { ascending: false }),
        admin
          .from("payouts")
          .select("id, amount, voucher_count, method, reference, paid_at, status, store_note")
          .eq("store_id", store.id)
          .order("paid_at", { ascending: false }),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ];
  if (redeemedError) throw new Error(`Could not load redeemed vouchers: ${redeemedError.message}`);
  if (payoutsError) throw new Error(`Could not load payments: ${payoutsError.message}`);
  const redeemed = (redeemedRaw ?? []) as Voucher[];
  const payouts = (payoutsRaw ?? []) as Payout[];
  const statusOf = new Map(payouts.map((p) => [p.id, p.status]));
  const total = redeemed.reduce((sum, v) => sum + Number(v.amount), 0);
  const paid = payouts.filter((p) => p.status === "confirmed").reduce((sum, p) => sum + Number(p.amount), 0);
  const pending = payouts.filter((p) => p.status === "pending");

  return (
    <div className="mx-auto min-h-dvh max-w-[480px]">
      <AppHeader title={store?.name ?? "Partner store"} sub={`Sari-sari store · ${viewer.barangayName}`} />
      <main className="px-4 pb-12 pt-2">
        {!store ? (
          <>
            <PageTitle>Redeem voucher</PageTitle>
            <Notice tone="warning">Your account is not linked to a store. Ask the barangay admin to add you as a partner store.</Notice>
          </>
        ) : !store.approved_at ? (
          <section className="rounded-lg bg-surface p-5 shadow-receipt">
            <Clock size={24} strokeWidth={1.75} aria-hidden />
            <h1 className="mt-3 text-display font-semibold">Waiting for the barangay</h1>
            <p className="mt-2 text-muted">
              {store.name} is signed up. Once your barangay admin approves it, top savers can bring their vouchers here and you redeem them on this
              page.
            </p>
          </section>
        ) : (
          <>
            <PageTitle sub="Type the 6-character code under the customer's QR, or scan the QR.">Redeem voucher</PageTitle>
            <RedeemForm />

            {pending.length > 0 && (
              <div className="mt-8">
                <Section title="Payments to confirm">
                  <ul className="flex flex-col gap-3">
                    {pending.map((p) => (
                      <li key={p.id} className="rounded-md bg-surface p-4 shadow-receipt">
                        <p>
                          <span className="num text-amount-lg font-semibold">{peso(Number(p.amount))}</span> from the barangay
                        </p>
                        <p className="text-small text-muted">
                          {shortDate(p.paid_at)} · {PAYOUT_METHODS[p.method]} ref <span className="num">{p.reference}</span> · {p.voucher_count} voucher
                          {p.voucher_count === 1 ? "" : "s"}
                        </p>
                        <ValidatedForm action={respondPayout} schema="payoutResponse" className="mt-3 flex flex-col gap-2">
                          <input type="hidden" name="payout_id" value={p.id} />
                          <input type="hidden" name="received" value="yes" />
                          <SubmitButton
                            pendingText="Saving…"
                            data-confirm-title={`Confirm you received ${peso(Number(p.amount))}?`}
                            data-confirm-body="The barangay will see this payment as confirmed. You can't change it afterwards."
                            data-confirm-label="I received it"
                          >
                            I received it
                          </SubmitButton>
                        </ValidatedForm>
                        <details className="mt-2">
                          <summary className={`${buttonStyles.secondary} w-full list-none [&::-webkit-details-marker]:hidden`}>Not received</summary>
                          <ValidatedForm action={respondPayout} schema="payoutResponse" className="mt-3 flex flex-col gap-3">
                            <input type="hidden" name="payout_id" value={p.id} />
                            <input type="hidden" name="received" value="no" />
                            <Field
                              label="What's wrong?"
                              id={`note-${p.id}`}
                              name="note"
                              maxLength={300}
                              required
                              hint="e.g. the GCash transfer hasn't arrived, or the amount is short"
                            />
                            <SubmitButton
                              variant="secondary"
                              pendingText="Saving…"
                              data-confirm-title="Mark this payment as not received?"
                              data-confirm-body="The barangay sees your note and settles it with you in person. You can't change it afterwards."
                              data-confirm-label="Not received"
                              data-confirm-tone="destructive"
                            >
                              Send to the barangay
                            </SubmitButton>
                          </ValidatedForm>
                        </details>
                      </li>
                    ))}
                  </ul>
                </Section>
              </div>
            )}

            <div className="mt-8">
              <Section title="Redeemed here">
                {redeemed.length === 0 ? (
                  <p className="flex gap-3 rounded-md bg-surface p-4 text-small text-muted shadow-receipt">
                    <QrCode size={16} strokeWidth={1.75} aria-hidden className="mt-0.5 shrink-0" />
                    No vouchers yet. Each month the barangay gives its top savers a voucher for this store; they&apos;ll show you a QR code.
                  </p>
                ) : (
                  <div className="rounded-md bg-surface shadow-receipt">
                    <div className="grid grid-cols-2 gap-3 border-b border-dashed border-border-strong px-4 py-3">
                      <p>
                        <span className="block text-small text-muted">Waiting for payment</span>
                        <span className="num text-amount-lg font-semibold">{peso(total - paid)}</span>
                      </p>
                      <p className="text-right">
                        <span className="block text-small text-muted">Paid</span>
                        <span className="num text-amount-lg font-semibold">{peso(paid)}</span>
                      </p>
                    </div>
                    <ul className="divide-y divide-border">
                      {redeemed.slice(0, 20).map((v) => {
                        const state = VOUCHER_STATE[v.payout_id ? (statusOf.get(v.payout_id) ?? "pending") : "unpaid"];
                        return (
                          <li key={v.code} className="flex items-baseline justify-between gap-3 px-4 py-3">
                            <span>
                              <span className="num block">{v.code}</span>
                              <span className="num block text-small text-muted">
                                {peso(Number(v.amount))} · {new Date(v.redeemed_at).toLocaleString("en-PH", { dateStyle: "short", timeStyle: "short" })}
                              </span>
                            </span>
                            <span className={`text-small font-semibold ${state.tone}`}>{state.label}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </Section>
            </div>

            {payouts.length > 0 && (
              <Section title="Payment history">
                <ul className="divide-y divide-border rounded-md bg-surface shadow-receipt">
                  {payouts.slice(0, 10).map((p) => (
                    <li key={p.id} className="px-4 py-3 text-small">
                      <p className="flex items-baseline justify-between gap-3">
                        <span>
                          {shortDate(p.paid_at)} · <span className="num font-semibold">{peso(Number(p.amount))}</span> · {p.voucher_count} voucher
                          {p.voucher_count === 1 ? "" : "s"}
                        </span>
                        <span className={`font-semibold ${PAYOUT_STATE[p.status].tone}`}>{PAYOUT_STATE[p.status].label}</span>
                      </p>
                      <p className="text-muted">
                        {PAYOUT_METHODS[p.method]} ref <span className="num">{p.reference}</span>
                        {p.store_note && <> · your note: “{p.store_note}”</>}
                      </p>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
