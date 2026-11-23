import { ExternalLink, Store } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { getLeaderboard, monthLabel } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { ToastFromParam, ValidatedForm } from "@/components/form";
import { SubmitButton } from "@/components/submit-button";
import { Field, Notice, PageTitle, Section, SelectField, kwh, pct, peso } from "@/components/ui";
import { effectiveRate } from "@/lib/scoring";
import { envStepNames } from "@/lib/extraction/extract";
import { AI_PRESETS, type PresetKey } from "@/lib/extraction/presets";
import { PAYOUT_METHODS } from "@/lib/validation";
import { addStore, issueVouchers, recordPayout, renameBarangay, reviewBill, reviewStore, saveBudget } from "./actions";
import { IssueTotal } from "./issue-total";
import { removeProvider, retestProvider, type TestResult } from "./ai-actions";
import { AddProviderForm, TestLog } from "./ai-providers";

export const metadata = { title: "Admin · Kuryentipid" };

export default async function AdminPage() {
  const viewer = await requireViewer("admin");
  const admin = createAdminClient();

  const [
    { data: flaggedRaw, error: flaggedError },
    { data: storesRaw, error: storesError },
    board,
    { data: providers, error: providersError },
    { data: brgy, error: brgyError },
  ] = await Promise.all([
    admin
      .from("bills")
      .select(
        "id, score_month, kwh, amount_due, baseline_kwh, flag_reasons, photo_path, served_by, households!inner(account_number, profiles!inner(household_label, barangay_id))",
      )
      .eq("status", "flagged")
      .eq("households.profiles.barangay_id", viewer.barangayId)
      .order("created_at"),
    admin
      .from("stores")
      .select(
        "id, name, approved_at, created_at, vouchers(amount, redeemed_at, payout_id, score_month), payouts(id, amount, voucher_count, method, reference, paid_at, status, store_note)",
      )
      .eq("barangay_id", viewer.barangayId)
      .order("name"),
    getLeaderboard(viewer.barangayId),
    admin.from("ai_providers").select("id, preset, model, key_hint, last_test").order("created_at"),
    admin.from("barangays").select("voucher_budget").eq("id", viewer.barangayId).single(),
  ]);
  if (flaggedError) throw new Error(`Could not load flagged bills: ${flaggedError.message}`);
  if (storesError) throw new Error(`Could not load stores: ${storesError.message}`);
  if (brgyError) throw new Error(`Could not load the barangay: ${brgyError.message}`);
  type Voucher = { amount: number; redeemed_at: string | null; payout_id: string | null; score_month: string };
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
  const sum = (list: { amount: number }[]) => list.reduce((total, x) => total + Number(x.amount), 0);
  const allStores = (storesRaw ?? []).map((s) => {
    const vouchers = s.vouchers as Voucher[];
    const redeemed = vouchers.filter((v) => v.redeemed_at);
    const unpaid = redeemed.filter((v) => !v.payout_id);
    const payouts = (s.payouts as Payout[]).toSorted((a, b) => b.paid_at.localeCompare(a.paid_at));
    return {
      ...s,
      vouchers,
      payouts,
      redeemedCount: redeemed.length,
      unpaidCount: unpaid.length,
      unpaidTotal: sum(unpaid),
      paidTotal: sum(payouts.filter((p) => p.status === "confirmed")),
      open: payouts.filter((p) => p.status !== "confirmed"),
    };
  });
  // Monthly voucher budget: vouchers issued (not redeemed) for the ranking month in this barangay.
  const budget = brgy.voucher_budget === null ? null : Number(brgy.voucher_budget);
  const budgetUsed = board.month ? sum(allStores.flatMap((s) => s.vouchers.filter((v) => v.score_month === board.month))) : 0;
  const budgetLeft = budget === null ? null : Math.max(0, budget - budgetUsed);
  const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-PH", { dateStyle: "medium", timeZone: "Asia/Manila" });
  const STATUS = {
    pending: { label: "Waiting for the store", tone: "text-muted" },
    confirmed: { label: "Confirmed", tone: "text-success" },
    disputed: { label: "Disputed", tone: "text-warning" },
  };
  const stores = allStores.filter((s) => s.approved_at);
  const pendingStores = allStores.filter((s) => !s.approved_at);
  if (providersError) throw new Error(`Could not load AI providers: ${providersError.message}`);
  const serverSteps = envStepNames();

  const photoPaths = [...new Set((flaggedRaw ?? []).map((b) => b.photo_path).filter((path): path is string => Boolean(path)))];
  const { data: signedPhotos } = photoPaths.length
    ? await admin.storage.from("bill-photos").createSignedUrls(photoPaths, 600)
    : { data: [] };
  const signedByPath = new Map((signedPhotos ?? []).map((photo) => [photo.path, photo.signedUrl]));

  const flagged = (flaggedRaw ?? []).map((b) => {
    const household = b.households as unknown as { account_number: string | null; profiles: { household_label: string } };
    return {
      ...b,
      label: household.profiles.household_label,
      accountNumber: household.account_number,
      photoUrl: b.photo_path ? signedByPath.get(b.photo_path) ?? null : null,
    };
  });

  const monthIds = board.month ? board.rows.map((r) => r.householdId) : [];
  const { data: issuedRows, error: issuedError } =
    board.month && monthIds.length
      ? await admin.from("vouchers").select("household_id").eq("score_month", board.month).in("household_id", monthIds)
      : { data: [], error: null };
  if (issuedError) throw new Error(`Could not load issued vouchers: ${issuedError.message}`);
  const alreadyIssued = new Set((issuedRows ?? []).map((v) => v.household_id));
  const nextWinners = board.rows.filter((r) => r.score > 0 && !alreadyIssued.has(r.householdId)).slice(0, 3);

  const sourceLabel = (servedBy: string | null) => {
    if (!servedBy) return "Typed by the resident";
    if (servedBy === "manual") return "Typed by the resident";
    if (servedBy === "demo-seed") return "Demo data";
    // Chain steps are named "<provider>:<model>", e.g. gemini:… or groq:… (see extract.ts).
    const [, ...model] = servedBy.split(":");
    return model.length ? `AI scan · ${model.join(":")}` : servedBy;
  };

  return (
    <div className="mx-auto min-h-dvh max-w-240">
      <AppHeader sub={`Barangay admin · ${viewer.barangayName}`} />
      <main className="px-4 pb-12 pt-2">
        <PageTitle sub="Review flagged bills, reward top savers, and manage partner stores.">{viewer.barangayName}</PageTitle>

        <ToastFromParam
          param="store"
          messages={{
            approve: { text: "Store approved. You can now pick it when issuing vouchers." },
            decline: { text: "Store declined. The account is now a household account.", tone: "warning" },
          }}
        />
        <Section title={`Bills to review (${flagged.length})`}>
          <ToastFromParam
            param="reviewed"
            messages={{
              approve: { text: "Bill approved and added to the ranking." },
              reject: { text: "Bill rejected. It stays off the ranking.", tone: "warning" },
            }}
          />
          {flagged.length === 0 ? (
            <Notice tone="info">No bills to review.</Notice>
          ) : (
            <ul className="flex flex-col gap-3">
              {flagged.map((b) => (
                <li key={b.id} className="rounded-md bg-surface shadow-receipt p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-semibold">
                      {b.label} · {monthLabel(b.score_month)}
                    </p>
                    <p className="num text-small text-muted">
                      {kwh(Number(b.kwh))} · {peso(Number(b.amount_due))} · {peso(effectiveRate(Number(b.amount_due), Number(b.kwh)))}/kWh
                      {b.baseline_kwh !== null && ` · last year ${kwh(Number(b.baseline_kwh))}`}
                    </p>
                  </div>
                  {b.accountNumber && (
                    <p className="num mt-1 text-small text-muted">Account ····{b.accountNumber.slice(-4)}</p>
                  )}
                  <ul className="mt-2 list-disc pl-5 text-small text-warning">
                    {b.flag_reasons.map((r: string) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                  <p className="mt-1 text-small text-muted">Source: {sourceLabel(b.served_by)}</p>
                  {b.photoUrl ? (
                    <a href={b.photoUrl} target="_blank" rel="noreferrer" className="mt-2 block">
                      {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL from storage */}
                      <img
                        src={b.photoUrl}
                        alt={`Bill photo for ${b.label}`}
                        className="mt-1 max-h-64 w-full object-contain"
                      />
                      <span className="mt-1 inline-flex items-center gap-1 text-small font-semibold text-primary underline">
                        Open full size
                        <ExternalLink size={12} aria-hidden />
                        <span className="sr-only">(opens in a new tab)</span>
                      </span>
                    </a>
                  ) : (
                    <p className="mt-2 text-small text-muted">Typed in by hand, no photo.</p>
                  )}
                  <ValidatedForm action={reviewBill} className="mt-3 flex flex-col gap-2">
                    <input type="hidden" name="id" value={b.id} />
                    <div className="flex gap-2">
                      <SubmitButton
                        name="decision"
                        value="approve"
                        pendingText="Saving…"
                        data-confirm-title={`Approve ${b.label}'s bill?`}
                        data-confirm-body="It will be scored and added to this month's ranking. This can't be undone."
                        data-confirm-label="Approve"
                      >
                        Approve
                      </SubmitButton>
                      <SubmitButton
                        name="decision"
                        value="reject"
                        variant="secondary"
                        pendingText="Saving…"
                        data-confirm-title={`Reject ${b.label}'s bill?`}
                        data-confirm-body="It stays off the ranking. The household will see that the bill could not be verified."
                        data-confirm-label="Reject bill"
                        data-confirm-tone="destructive"
                      >
                        Reject
                      </SubmitButton>
                    </div>
                  </ValidatedForm>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {pendingStores.length > 0 && (
          <Section title={`New store sign-ups (${pendingStores.length})`}>
            <p className="mb-3 text-small text-muted">These owners signed up as partner stores. Approve only stores you know are in the barangay; approved stores can receive vouchers.</p>
            <ul className="flex flex-col gap-3">
              {pendingStores.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-surface p-4 shadow-receipt">
                  <p className="flex items-center gap-3">
                    <Store size={15} strokeWidth={1.75} aria-hidden className="shrink-0 text-muted" />
                    <span>
                      <span className="block font-semibold">{s.name}</span>
                      <span className="block text-small text-muted">Signed up {new Date(s.created_at).toLocaleDateString("en-PH", { dateStyle: "medium" })}</span>
                    </span>
                  </p>
                  <ValidatedForm action={reviewStore} className="flex gap-2">
                    <input type="hidden" name="id" value={s.id} />
                    <SubmitButton
                      name="decision"
                      value="approve"
                      pendingText="Saving…"
                      data-confirm-title={`Approve ${s.name}?`}
                      data-confirm-body="It becomes a partner store and can be picked when you issue vouchers."
                      data-confirm-label="Approve store"
                    >
                      Approve
                    </SubmitButton>
                    <SubmitButton
                      name="decision"
                      value="decline"
                      variant="secondary"
                      pendingText="Saving…"
                      data-confirm-title={`Decline ${s.name}?`}
                      data-confirm-body="The store is removed and the account becomes a household account."
                      data-confirm-label="Decline store"
                      data-confirm-tone="destructive"
                    >
                      Decline
                    </SubmitButton>
                  </ValidatedForm>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <div className="grid gap-8 md:grid-cols-2">
          <Section title="Reward top savers">
            <p className="mb-3 text-small text-muted">
              {board.month
                ? `${monthLabel(board.month)}: ${board.rows.length} household${board.rows.length === 1 ? "" : "s"} ranked. Vouchers go to the highest scores that don't have one yet.`
                : "No scored bills yet."}
            </p>
            {board.month && (
              <div className="mb-3 rounded-sm bg-surface-2 px-3 py-2 text-small">
                <p className="font-semibold">Next in line (up to 3)</p>
                <p className="mt-0.5 text-muted">
                  {nextWinners.length
                    ? nextWinners.map((w) => `${w.label} (${pct(w.score)})`).join(", ")
                    : "Everyone ranked this month already has a voucher."}
                </p>
              </div>
            )}
            {budget !== null && board.month && (
              <p className="mb-3 text-small">
                Budget this month: <strong className="num">{peso(budgetUsed)}</strong> of <span className="num">{peso(budget)}</span> used,{" "}
                <strong className="num">{peso(budgetLeft ?? 0)}</strong> left
              </p>
            )}
            {budget !== null && board.month && budgetLeft === 0 && (
              <div className="mb-3">
                <Notice tone="warning">This month&apos;s {peso(budget)} voucher budget is used up. Raise it under Barangay below to issue more.</Notice>
              </div>
            )}
            {stores.length > 0 ? (
              <ValidatedForm action={issueVouchers} schema="vouchers">
                <SelectField label="Store" name="store_id" required>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </SelectField>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Vouchers" name="count" type="number" min="1" max="50" defaultValue="3" required />
                  <Field label="Amount (₱)" name="amount" type="number" min="1" max="5000" defaultValue="50" required />
                  <Field label="Valid (days)" name="days" type="number" min="1" max="90" defaultValue="30" required />
                </div>
                <IssueTotal defaultCount={3} defaultAmount={50} />
                <SubmitButton
                  pendingText="Issuing…"
                  disabled={!board.month || budgetLeft === 0}
                  data-confirm-title="Issue vouchers now?"
                  data-confirm-body="Codes go straight to the top savers who don't have one this month. Issued vouchers can't be taken back."
                  data-confirm-label="Issue vouchers"
                >
                  Issue vouchers
                </SubmitButton>
              </ValidatedForm>
            ) : (
              <Notice tone="info">Add a partner store first.</Notice>
            )}
          </Section>

          <Section title="Partner stores">
            {stores.length > 0 && (
              <ul className="mb-4 divide-y divide-border rounded-md bg-surface shadow-receipt">
                {stores.map((s) => (
                  <li key={s.id} className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <Store size={15} strokeWidth={1.75} aria-hidden className="mt-1 shrink-0 text-muted" />
                      <span className="min-w-0 flex-1 font-semibold">
                        {s.name}
                        <span className="block text-small font-normal text-muted">{s.redeemedCount} redeemed</span>
                      </span>
                      <span className="shrink-0 text-right text-small">
                        <span className="block">
                          Unpaid <strong className="num">{peso(s.unpaidTotal)}</strong>
                        </span>
                        <span className="block text-muted">
                          Paid <span className="num">{peso(s.paidTotal)}</span>
                        </span>
                      </span>
                    </div>
                    {s.open.map((po) =>
                      po.status === "disputed" ? (
                        <div key={po.id} className="mt-2">
                          <Notice tone="warning">
                            {s.name} says {peso(Number(po.amount))} ({shortDate(po.paid_at)}, {PAYOUT_METHODS[po.method]} ref {po.reference}) was not
                            received: “{po.store_note}”. Settle it in person.
                          </Notice>
                        </div>
                      ) : (
                        <p key={po.id} className="mt-2 text-small text-muted">
                          <span className="num">{peso(Number(po.amount))}</span> recorded {shortDate(po.paid_at)} · {PAYOUT_METHODS[po.method]} ref{" "}
                          {po.reference} · waiting for the store to confirm
                        </p>
                      ),
                    )}
                    {s.unpaidTotal > 0 && (
                      <ValidatedForm action={recordPayout} schema="payout" className="mt-3 flex flex-col gap-3">
                        <input type="hidden" name="store_id" value={s.id} />
                        <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
                          <SelectField label="Paid by" id={`method-${s.id}`} name="method" defaultValue="gcash">
                            {Object.entries(PAYOUT_METHODS).map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </SelectField>
                          <Field
                            label="Reference"
                            id={`reference-${s.id}`}
                            name="reference"
                            maxLength={60}
                            required
                            hint="GCash ref, bank ref or OR number"
                          />
                        </div>
                        <SubmitButton
                          variant="secondary"
                          pendingText="Recording…"
                          data-confirm-title={`Record ${peso(s.unpaidTotal)} paid to ${s.name}?`}
                          data-confirm-body={`This locks the ${s.unpaidCount} unpaid redeemed voucher${s.unpaidCount === 1 ? "" : "s"} into one payment and can't be undone. The store is then asked to confirm it received the money.`}
                          data-confirm-label="Record payment"
                        >
                          Record payment
                        </SubmitButton>
                      </ValidatedForm>
                    )}
                    {s.payouts.length > 0 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-small font-semibold">Payment history ({s.payouts.length})</summary>
                        <ul className="mt-2 flex flex-col gap-1.5 text-small">
                          {s.payouts.map((po) => (
                            <li key={po.id} className="flex flex-wrap items-baseline justify-between gap-x-3">
                              <span>
                                {shortDate(po.paid_at)} · <span className="num font-semibold">{peso(Number(po.amount))}</span> · {po.voucher_count} voucher
                                {po.voucher_count === 1 ? "" : "s"} · {PAYOUT_METHODS[po.method]} ref <span className="num">{po.reference}</span>
                              </span>
                              <span className={STATUS[po.status].tone}>{STATUS[po.status].label}</span>
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <p className="mb-3 text-small text-muted">Store owners can also sign up on their own as a sari-sari store. New sign-ups wait at the top of this page for your approval.</p>
            <ValidatedForm action={addStore} schema="store" resetOnSuccess>
              <Field label="Store name" id="store_name" name="name" required maxLength={60} />
              <Field label="Owner's account email" name="email" type="email" required hint="Links an existing account as this store's owner." />
              <SubmitButton variant="secondary" pendingText="Adding…">
                Add store
              </SubmitButton>
            </ValidatedForm>
          </Section>
        </div>

        <Section title="Photo reading (AI)">
          <p className="mb-3 max-w-[70ch] text-small text-muted">
            When a resident scans a bill or an appliance sticker, the app asks these in order and keeps the first answer that fits. If every one
            fails, the resident types the numbers in. Add a fallback below for when a quota runs out.
          </p>
          <ol className="mb-6 divide-y divide-border rounded-md bg-surface shadow-receipt">
            {serverSteps.map((name, i) => (
              <li key={name} className="flex items-center gap-3 px-4 py-3">
                <span className="num w-6 shrink-0 text-muted">{i + 1}.</span>
                <span className="num min-w-0 flex-1 truncate font-semibold">{name}</span>
                <span className="shrink-0 text-small text-muted">Server setting</span>
              </li>
            ))}
            {(providers ?? []).map((p, i) => {
              const test = p.last_test as TestResult | null;
              return (
                <li key={p.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span className="num w-6 shrink-0 text-muted">{serverSteps.length + i + 1}.</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{AI_PRESETS[p.preset as PresetKey]?.label ?? p.preset}</span>
                      <span className="num block truncate text-small text-muted">
                        {p.model} · key ••••{p.key_hint}
                      </span>
                    </span>
                    {test && (
                      <span className={`text-small ${test.passed ? "text-success" : "text-error"}`}>
                        {test.passed ? `Passed in ${(test.ms / 1000).toFixed(1)} s` : "Last test failed"} ·{" "}
                        {new Date(test.at).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" })}
                      </span>
                    )}
                    <ValidatedForm action={retestProvider} className="contents">
                      <input type="hidden" name="id" value={p.id} />
                      <SubmitButton variant="secondary" pendingText="Testing…">
                        Test again
                      </SubmitButton>
                    </ValidatedForm>
                    <ValidatedForm action={removeProvider} className="contents">
                      <input type="hidden" name="id" value={p.id} />
                      <SubmitButton
                        variant="ghost"
                        pendingText="Removing…"
                        data-confirm-title={`Remove ${p.model}?`}
                        data-confirm-body="Scans stop trying this provider. Its saved key is deleted."
                        data-confirm-label="Remove"
                        data-confirm-tone="destructive"
                      >
                        Remove
                      </SubmitButton>
                    </ValidatedForm>
                  </div>
                  {test && test.log.length > 0 && (
                    <details className="mt-2 pl-9">
                      <summary className="cursor-pointer text-small font-semibold">Test log</summary>
                      <div className="mt-2">
                        <TestLog log={test.log} />
                      </div>
                    </details>
                  )}
                </li>
              );
            })}
            <li className="flex items-center gap-3 px-4 py-3 text-muted">
              <span className="num w-6 shrink-0">{serverSteps.length + (providers?.length ?? 0) + 1}.</span>
              <span className="flex-1">Manual entry: the resident types the numbers</span>
              <span className="shrink-0 text-small">Always</span>
            </li>
          </ol>
          <div className="md:max-w-xl">
            <h3 className="mb-3 font-semibold">Add a fallback provider</h3>
            <AddProviderForm />
          </div>
        </Section>

        <Section title="Barangay">
          <div className="grid items-start gap-6 md:grid-cols-2">
            <ValidatedForm action={renameBarangay} schema="barangayName">
              <Field label="Barangay name" id="barangay_name" name="name" defaultValue={viewer.barangayName} required maxLength={80} />
              <SubmitButton variant="secondary" pendingText="Saving…">
                Save name
              </SubmitButton>
            </ValidatedForm>
            <ValidatedForm action={saveBudget} schema="budget">
              <Field
                label="Monthly voucher budget (₱)"
                name="voucher_budget"
                type="number"
                inputMode="numeric"
                min="0"
                max="1000000"
                step="1"
                defaultValue={budget ?? ""}
                hint="Leave blank for no limit."
              />
              <SubmitButton variant="secondary" pendingText="Saving…">
                Save budget
              </SubmitButton>
            </ValidatedForm>
          </div>
        </Section>
      </main>
    </div>
  );
}
