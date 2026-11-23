import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createAdminClient, createUserClient } from "@/lib/supabase/server";

export type Role = "resident" | "store" | "admin";
export type Viewer = {
  userId: string;
  email: string;
  role: Role;
  barangayId: string;
  barangayName: string;
  householdLabel: string;
  householdId: string;
  accountNumber: string | null;
};

/** The signed-in user with profile and household, or null. Cached per request. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role, barangay_id, household_label, barangays(name), households(id, account_number)")
    .eq("id", user.id)
    .single();
  if (!profile) return null;

  const household = Array.isArray(profile.households) ? profile.households[0] : profile.households;
  const barangay = Array.isArray(profile.barangays) ? profile.barangays[0] : profile.barangays;
  return {
    userId: user.id,
    email: user.email ?? "",
    role: profile.role as Role,
    barangayId: profile.barangay_id,
    barangayName: (barangay as { name: string } | null)?.name ?? "",
    householdLabel: profile.household_label,
    householdId: (household as { id: string }).id,
    accountNumber: (household as { account_number: string | null }).account_number,
  };
});

/** For pages and actions: returns the viewer or redirects. Optionally restricts roles. */
export async function requireViewer(...roles: Role[]): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (roles.length && !roles.includes(viewer.role)) redirect("/");
  return viewer;
}

export function homeFor(role: Role): string {
  return role === "admin" ? "/admin" : role === "store" ? "/store" : "/receipt";
}
