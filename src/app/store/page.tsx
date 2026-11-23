import { Clock, QrCode } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { Notice, PageTitle, Section, peso } from "@/components/ui";
import { RedeemForm } from "./redeem-form";

export const metadata = { title: "Store · Kuryentipid" };

export default async function StorePage() {
  const viewer = await requireViewer("store");
  const admin = createAdminClient();
  const { data: store, error: storeError } = await admin
    .from("stores")
    .select("id, name, approved_at")
    .eq("owner_profile_id", viewer.userId)
    .maybeSingle();
  if (storeError) throw new Error(`Could not load the store: ${storeError.message}`);
  const { data: redeemed, error: redeemedError } = store
    ? await admin
        .from("vouchers")
        .select("code, amount, redeemed_at")
        .eq("store_id", store.id)
        .not("redeemed_at", "is", null)
        .order("redeemed_at", { ascending: false })
    : { data: [], error: null };
  if (redeemedError) throw new Error(`Could not load redeemed vouchers: ${redeemedError.message}`);
  const used = redeemed ?? [];
  const total = used.reduce((sum, v) => sum + Number(v.amount), 0);

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

            <div className="mt-8">
              <Section title="Redeemed here">
                {used.length === 0 ? (
                  <p className="flex gap-3 rounded-md bg-surface p-4 text-small text-muted shadow-receipt">
                    <QrCode size={16} strokeWidth={1.75} aria-hidden className="mt-0.5 shrink-0" />
                    No vouchers yet. Each month the barangay gives its top savers a voucher for this store; they&apos;ll show you a QR code.
                  </p>
                ) : (
                  <div className="rounded-md bg-surface shadow-receipt">
                    <p className="flex items-baseline justify-between gap-3 border-b border-dashed border-border-strong px-4 py-3">
                      <span className="text-small text-muted">
                        {used.length} {used.length === 1 ? "voucher" : "vouchers"} · the barangay pays you back
                      </span>
                      <span className="num text-amount-lg font-semibold">{peso(total)}</span>
                    </p>
                    <ul className="divide-y divide-border">
                      {used.slice(0, 20).map((v) => (
                        <li key={v.code} className="flex justify-between gap-3 px-4 py-3">
                          <span className="num">{v.code}</span>
                          <span className="num text-muted">
                            {peso(Number(v.amount))} · {new Date(v.redeemed_at!).toLocaleString("en-PH", { dateStyle: "short", timeStyle: "short" })}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
