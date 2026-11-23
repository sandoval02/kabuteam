"use server";

import { revalidatePath } from "next/cache";
import { parseForm, voucherCode } from "@/lib/validation";
import { requireViewer } from "@/lib/auth";
import { createUserClient } from "@/lib/supabase/server";

export type RedeemState = { tone?: "success" | "error"; message?: string; amount?: number; ok?: string; error?: string; fieldErrors?: Record<string, string | undefined> };

const MESSAGES: Record<string, string> = {
  not_found: "No voucher has this code. Check the letters and try again.",
  wrong_store: "This voucher is for a different store.",
  expired: "This voucher has expired.",
  not_store: "Your account is not linked to a store. Ask the barangay to add you.",
};

export async function redeem(_: RedeemState, form: FormData): Promise<RedeemState> {
  await requireViewer("store");
  const parsed = parseForm(voucherCode, form);
  if ("state" in parsed) return parsed.state;
  const code = { data: parsed.data.code };

  // Runs as the store owner: the database function checks ownership and redeems atomically.
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("redeem_voucher", { p_code: code.data });
  if (error || !data?.[0]) {
    console.error("[redeem]", error);
    return { tone: "error", message: "Could not check the voucher. Try again." };
  }
  const r = data[0] as { status: string; amount: number | null; redeemed_at: string | null };
  if (r.status === "ok") {
    revalidatePath("/store");
    return { tone: "success", message: "Voucher accepted. Give the discount:", amount: Number(r.amount), ok: `Voucher ${code.data} redeemed` };
  }
  if (r.status === "used") {
    const when = new Date(r.redeemed_at!).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
    return { tone: "error", message: `Already used on ${when}.`, fieldErrors: { code: "This code was already redeemed" } };
  }
  return { tone: "error", message: MESSAGES[r.status] ?? "Could not redeem this voucher." };
}
