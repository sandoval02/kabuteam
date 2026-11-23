import { Store } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { getLeaderboard, monthLabel } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { ToastFromParam, ValidatedForm } from "@/components/form";
import { SubmitButton } from "@/components/submit-button";
import { Field, Notice, PageTitle, Section, SelectField, kwh, peso } from "@/components/ui";
import { effectiveRate } from "@/lib/scoring";
import { addStore, issueVouchers, renameBarangay, reviewBill } from "./actions";

export default async function AdminPage() {
  const viewer = await requireViewer("admin");
  const admin = createAdminClient();

  const [{ data: flaggedRaw }, { data: stores }, board] = await Promise.all([
    admin
      .from("bills")
      .select("id, score_month, kwh, amount_due, baseline_kwh, flag_reasons, photo_path, households!inner(profiles!inner(household_label, barangay_id))")
      .eq("status", "flagged")
      .eq("households.profiles.barangay_id", viewer.barangayId)
      .order("created_at"),
    admin.from("stores").select("id, name").eq("barangay_id", viewer.barangayId).order("name"),
    getLeaderboard(viewer.barangayId),
  ]);

  const flagged = await Promise.all(
    (flaggedRaw ?? []).map(async (b) => ({
      ...b,
      label: (b.households as unknown as { profiles: { household_label: string } }).profiles.household_label,
      photoUrl: b.photo_path
        ? (await admin.storage.from("bill-photos").createSignedUrl(b.photo_path, 600)).data?.signedUrl ?? null
        : null,
    })),
  );

  return (
    <div className="mx-auto min-h-dvh max-w-240">
      <AppHeader sub={`Barangay admin · ${viewer.barangayName}`} />
      <main className="px-4 pb-12 pt-2">
        <PageTitle sub="Review flagged bills, reward top savers, and manage partner stores.">{viewer.barangayName}</PageTitle>

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
                  <ul className="mt-2 list-disc pl-5 text-small text-warning">
                    {b.flag_reasons.map((r: string) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                  {b.photoUrl ? (
                    <a href={b.photoUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-small font-semibold text-primary underline">
                      Open bill photo
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

        <div className="grid gap-8 md:grid-cols-2">
          <Section title="Reward top savers">
            <p className="mb-3 text-small text-muted">
              {board.month
                ? `${monthLabel(board.month)}: ${board.rows.length} household${board.rows.length === 1 ? "" : "s"} ranked. Vouchers go to the highest scores that don't have one yet.`
                : "No scored bills yet."}
            </p>
            {stores && stores.length > 0 ? (
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
                <SubmitButton
                  pendingText="Issuing…"
                  disabled={!board.month}
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
            {stores && stores.length > 0 && (
              <ul className="mb-4 divide-y divide-border rounded-md bg-surface shadow-receipt">
                {stores.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                    <Store size={15} strokeWidth={1.75} aria-hidden className="shrink-0 text-muted" />
                    <span className="font-semibold">{s.name}</span>
                  </li>
                ))}
              </ul>
            )}
            <ValidatedForm action={addStore} schema="store" resetOnSuccess>
              <Field label="Store name" id="store_name" name="name" required maxLength={60} />
              <Field label="Owner's account email" name="email" type="email" required hint="The owner must create an account first." />
              <SubmitButton variant="secondary" pendingText="Adding…">
                Add store
              </SubmitButton>
            </ValidatedForm>
          </Section>
        </div>

        <Section title="Barangay">
          <ValidatedForm action={renameBarangay} schema="barangayName" className="flex flex-col gap-4 md:max-w-md">
            <Field label="Barangay name" id="barangay_name" name="name" defaultValue={viewer.barangayName} required maxLength={80} />
            <SubmitButton variant="secondary" pendingText="Saving…">
              Save name
            </SubmitButton>
          </ValidatedForm>
        </Section>
      </main>
    </div>
  );
}
