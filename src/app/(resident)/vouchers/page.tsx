import Link from "next/link";
import QRCode from "qrcode";
import { Ticket } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { getLeaderboard, monthLabel } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/server";
import { PageTitle, buttonStyles, pct, peso, savingsText } from "@/components/ui";

export const metadata = { title: "Vouchers · TipidTayo" };

type VoucherState = "active" | "expired" | "used";
const STATE_ORDER: Record<VoucherState, number> = { active: 0, expired: 1, used: 2 };

export default async function VouchersPage() {
  const viewer = await requireViewer("resident");
  const board = await getLeaderboard(viewer.barangayId);
  const myRank = board.rows.findIndex((r) => r.householdId === viewer.householdId);
  const { data, error } = await createAdminClient()
    .from("vouchers")
    .select("id, code, amount, score_month, expires_at, redeemed_at, created_at, stores(name)")
    .eq("household_id", viewer.householdId);
  if (error) throw new Error(`Could not load vouchers: ${error.message}`);

  const vouchers = await Promise.all(
    (data ?? []).map(async (v) => {
      const state: VoucherState = v.redeemed_at ? "used" : new Date(v.expires_at) < new Date() ? "expired" : "active";
      return {
        ...v,
        state,
        store: (v.stores as unknown as { name: string }).name,
        qr: state === "active" ? await QRCode.toDataURL(v.code, { margin: 1, width: 240, color: { dark: "#1c1917", light: "#ffffff" } }) : null,
      };
    }),
  );
  vouchers.sort(
    (a, b) => STATE_ORDER[a.state] - STATE_ORDER[b.state] || new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return (
    <>
      <PageTitle sub="Show the QR code at the partner store.">Vouchers</PageTitle>
      {vouchers.length === 0 ? (
        <div className="rounded-md bg-surface p-4 shadow-receipt">
          <Ticket size={18} strokeWidth={1.75} aria-hidden className="text-muted" />
          <p className="mt-2 font-semibold">No vouchers yet</p>
          <p className="mt-1 text-muted">
            Each month the barangay gives vouchers at partner sari-sari stores to its top savers.
            {myRank >= 0 && board.month && (
              <>
                {" "}
                For {monthLabel(board.month)} you are <strong className="text-text">#{myRank + 1} of {board.rows.length}</strong> with a{" "}
                <span className="num text-primary">{pct(board.rows[myRank].score)}</span> score
                {` (${savingsText(board.rows[myRank].savingsPct)}).`}
              </>
            )}
          </p>
          <Link href="/ranking" className={`${buttonStyles.secondary} mt-4`}>
            See the ranking
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {vouchers.map((v) => (
            <li key={v.id} className={`rounded-md p-4 shadow-receipt ${v.state === "active" ? "bg-surface" : "bg-surface-2"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="flex items-center gap-2 font-semibold">
                    <Ticket size={15} strokeWidth={1.75} aria-hidden className="shrink-0" />
                    {peso(Number(v.amount))} off at {v.store}
                  </h2>
                  <p className="text-small text-muted">Top saver, {monthLabel(v.score_month)}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-small font-semibold ${
                    v.state === "active" ? "bg-primary-soft text-text" : "bg-surface text-muted ring-1 ring-border"
                  }`}
                >
                  {v.state === "active" ? "Active" : v.state === "used" ? "Used" : "Expired"}
                </span>
              </div>
              {v.state === "active" && v.qr ? (
                <div className="mt-4 flex flex-col items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element -- generated data URL */}
                  <img src={v.qr} alt={`QR code for voucher ${v.code}`} width={240} height={240} className="h-auto w-full max-w-[240px]" />
                  <p className="num text-h2 font-semibold tracking-widest">{v.code}</p>
                  <p className="text-small text-muted">
                    Valid until {new Date(v.expires_at).toLocaleDateString("en-PH", { dateStyle: "medium" })}. Turn your screen brightness up.
                  </p>
                </div>
              ) : (
                <div className="mt-2">
                  <p className="num text-small font-semibold tracking-widest text-muted">{v.code}</p>
                  <p className="mt-1 text-small font-semibold text-muted">
                    {v.state === "used"
                      ? `Used on ${new Date(v.redeemed_at!).toLocaleDateString("en-PH", { dateStyle: "medium" })}`
                      : `Expired on ${new Date(v.expires_at).toLocaleDateString("en-PH", { dateStyle: "medium" })}`}
                  </p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
