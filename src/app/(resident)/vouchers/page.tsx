import Link from "next/link";
import QRCode from "qrcode";
import { Ticket } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { getLeaderboard, monthLabel } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/server";
import { buttonStyles, pct, peso } from "@/components/ui";

export const metadata = { title: "Vouchers · Kuryentipid" };

export default async function VouchersPage() {
  const viewer = await requireViewer("resident");
  const board = await getLeaderboard(viewer.barangayId);
  const myRank = board.rows.findIndex((r) => r.householdId === viewer.householdId);
  const { data, error } = await createAdminClient()
    .from("vouchers")
    .select("id, code, amount, score_month, expires_at, redeemed_at, stores(name)")
    .eq("household_id", viewer.householdId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Could not load vouchers: ${error.message}`);

  const vouchers = await Promise.all(
    (data ?? []).map(async (v) => ({
      ...v,
      store: (v.stores as unknown as { name: string }).name,
      state: v.redeemed_at ? "used" : new Date(v.expires_at) < new Date() ? "expired" : "active",
      qr: await QRCode.toDataURL(v.code, { margin: 1, width: 240, color: { dark: "#1c1917", light: "#ffffff" } }),
    })),
  );

  const active = vouchers.filter((v) => v.state === "active");
  const activeTotal = active.reduce((sum, v) => sum + Number(v.amount), 0);
  const ranked = myRank >= 0 && board.month !== null;

  return (
    <>
      <h1 className="sr-only">Vouchers</h1>
      {/* Lime hero with real numbers: what's ready to use now, and where this month's ranking stands. */}
      <section className="mb-3 rounded-lg bg-lime p-5 text-on-lime">
        {active.length > 0 ? (
          <>
            <p className="text-small">Ready to use</p>
            <p className="num text-[2.25rem] font-semibold leading-tight">{peso(activeTotal)}</p>
            <p className="text-small">
              {active.length} active {active.length === 1 ? "voucher" : "vouchers"}. Show the QR code at the partner store.
            </p>
          </>
        ) : (
          <>
            <p className="font-display text-h2 font-semibold">No vouchers ready</p>
            <p className="mt-1 text-small">Each month the barangay gives vouchers at partner sari-sari stores to its top savers.</p>
          </>
        )}
        {ranked && (
          <p className="mt-3 text-small">
            {monthLabel(board.month!)}: you&apos;re <strong className="num">#{myRank + 1}</strong> of {board.rows.length} at{" "}
            <strong className="num">{pct(board.rows[myRank].score)}</strong>.
          </p>
        )}
        {active.length === 0 && (
          <Link href="/ranking" className={`${buttonStyles.primary} mt-4 w-full`}>
            See the ranking
          </Link>
        )}
      </section>
      {vouchers.length > 0 && (
        <ul className="flex flex-col gap-3">
          {vouchers.map((v) => (
            <li
              key={v.id}
              className={`rounded-md bg-surface p-3.5 shadow-receipt ${v.state !== "active" ? "opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 font-semibold">
                    <Ticket size={14} strokeWidth={1.75} aria-hidden />
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
