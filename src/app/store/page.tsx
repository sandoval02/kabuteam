import { requireViewer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { Notice, PageTitle, Section, peso } from "@/components/ui";
import { RedeemForm } from "./redeem-form";

export default async function StorePage() {
  const viewer = await requireViewer("store");
  const admin = createAdminClient();
  const { data: store } = await admin.from("stores").select("id, name").eq("owner_profile_id", viewer.userId).maybeSingle();
  const { data: recent } = store
    ? await admin
        .from("vouchers")
        .select("code, amount, redeemed_at")
        .eq("store_id", store.id)
        .not("redeemed_at", "is", null)
        .order("redeemed_at", { ascending: false })
        .limit(10)
    : { data: [] };

  return (
    <div className="mx-auto min-h-dvh max-w-[480px]">
      <AppHeader title={store?.name ?? "Store"} sub={viewer.barangayName} />
      <main className="px-4 pb-12 pt-2">
        <PageTitle sub="Scan or type the code on the customer's phone.">Redeem voucher</PageTitle>
        {store ? <RedeemForm /> : <Notice tone="warning">Your account is not linked to a store yet. Ask the barangay admin to add you.</Notice>}

        {recent && recent.length > 0 && (
          <div className="mt-8">
            <Section title="Recently redeemed">
              <ul className="divide-y divide-border rounded-md border border-border bg-surface">
                {recent.map((v) => (
                  <li key={v.code} className="flex justify-between gap-3 px-4 py-3">
                    <span className="num">{v.code}</span>
                    <span className="num text-muted">
                      {peso(Number(v.amount))} · {new Date(v.redeemed_at!).toLocaleString("en-PH", { dateStyle: "short", timeStyle: "short" })}
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          </div>
        )}
      </main>
    </div>
  );
}
