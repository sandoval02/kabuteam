import Link from "next/link";
import QRCode from "qrcode";
import { Ticket } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { getLeaderboard, monthLabel } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/server";
import { PageTitle, buttonStyles, pct, peso } from "@/components/ui";

export default async function VouchersPage() {
  const viewer = await requireViewer("resident");
  const board = await getLeaderboard(viewer.barangayId);
  const myRank = board.rows.findIndex((r) => r.householdId === viewer.householdId);
  const { data } = await createAdminClient()
    .from("vouchers")
    .select("id, code, amount, score_month, expires_at, redeemed_at, stores(name)")
    .eq("household_id", viewer.householdId)
    .order("created_at", { ascending: false });

  const vouchers = await Promise.all(
    (data ?? []).map(async (v) => ({
      ...v,
      store: (v.stores as unknown as { name: string }).name,
      state: v.redeemed_at ? "used" : new Date(v.expires_at) < new Date() ? "expired" : "active",
      qr: await QRCode.toDataURL(v.code, { margin: 1, width: 240, color: { dark: "#1c1917", light: "#ffffff" } }),
    })),
  );

  return (
    <>
      <PageTitle sub="Show the QR code at the partner store.">Vouchers</PageTitle>
      {vouchers.length === 0 ? (
        <div className="rounded-md bg-surface shadow-receipt p-4">
          <Ticket size={18} strokeWidth={1.75} aria-hidden className="text-muted" />
          <p className="mt-2 font-semibold">No vouchers yet</p>
          <p className="mt-1 text-muted">
            Each month the barangay gives vouchers at partner sari-sari stores to its top savers.
            {myRank >= 0 && board.month && (
              <>
                {" "}
                For {monthLabel(board.month)} you are <strong className="text-text">#{myRank + 1} of {board.rows.length}</strong> at{" "}
                <span className="num text-primary">{pct(board.rows[myRank].score)}</span>.
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
            <li
              key={v.id}
              className={`rounded-md bg-surface shadow-receipt p-4 ${v.state !== "active" ? "opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 font-semibold">
                    <Ticket size={15} strokeWidth={1.75} aria-hidden />
                    {peso(Number(v.amount))} off at {v.store}
                  </p>
                  <p className="text-small text-muted">Top saver, {monthLabel(v.score_month)}</p>
                </div>
              </div>
              {v.state === "active" ? (
                <div className="mt-4 flex flex-col items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element -- generated data URL */}
                  <img src={v.qr} alt={`QR code for voucher ${v.code}`} width={240} height={240} />
                  <p className="num text-h2 font-semibold tracking-widest">{v.code}</p>
                  <p className="text-small text-muted">
                    Valid until {new Date(v.expires_at).toLocaleDateString("en-PH", { dateStyle: "medium" })}. Turn your screen brightness up.
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-small font-semibold text-muted">
                  {v.state === "used"
                    ? `Used on ${new Date(v.redeemed_at!).toLocaleDateString("en-PH", { dateStyle: "medium" })}`
                    : "Expired"}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
