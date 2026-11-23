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
  displayName: string | null;
  avatarUrl: string | null;
  initials: string;
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
    .select("role, barangay_id, household_label, display_name, avatar_path, barangays(name), households(id, account_number)")
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
    displayName: profile.display_name,
    avatarUrl: profile.avatar_path ? admin.storage.from("avatars").getPublicUrl(profile.avatar_path).data.publicUrl : null,
    initials: initialsOf(profile.display_name, user.email ?? ""),
  };
});

/** For pages and actions: returns the viewer or redirects. Optionally restricts roles. */
export async function requireViewer(...roles: Role[]): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (roles.length && !roles.includes(viewer.role)) redirect("/");
  return viewer;
}

function initialsOf(name: string | null, email: string): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return email.slice(0, 2).toUpperCase() || "?";
}

export function homeFor(role: Role): string {
  return role === "admin" ? "/admin" : role === "store" ? "/store" : "/home";
}
