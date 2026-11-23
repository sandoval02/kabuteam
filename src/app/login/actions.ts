"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { credentials, parseForm, signIn as signInSchema, signUp as signUpSchema, type FormState, type SignUpRole } from "@/lib/validation";
import { createAdminClient, createUserClient } from "@/lib/supabase/server";
import { adminEmails } from "@/lib/auth";

export type AuthState = FormState;

const GOOGLE_FAILED = "Google sign-in didn't go through. Try again, or use your email and password.";

/**
 * Checks the access token Google's sign-in popup returned: issued to this app's client ID (so a token
 * minted for some other app is refused), still valid, with a verified email. Then reads the name.
 */
async function verifyGoogle(token: string): Promise<{ email: string; name: string } | null> {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) return null;
  const call = (url: string, init?: RequestInit) =>
    fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(10_000) })
      .then((r) => (r.ok ? (r.json() as Promise<Record<string, string | undefined>>) : null))
      .catch(() => null);
  // ponytail: two calls to Google per sign-in (token check, then profile); fine at barangay scale.
  const info = await call(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(token)}`);
  if (!info || (info.aud !== clientId && info.azp !== clientId) || info.email_verified !== "true" || !info.email) return null;
  const profile = await call("https://openidconnect.googleapis.com/v1/userinfo", { headers: { authorization: `Bearer ${token}` } });
  if (profile?.email && profile.email.toLowerCase() !== info.email.toLowerCase()) return null;
  return { email: info.email.toLowerCase(), name: (profile?.name ?? "").trim().slice(0, 60) };
}

/**
 * Signs this browser in to an existing account without a password, once Google has vouched for the email.
 * Only call it for an account that exists: Supabase's magic link creates a bare account for an unknown email.
 */
async function startSession(email: string): Promise<boolean> {
  const { data, error } = await createAdminClient().auth.admin.generateLink({ type: "magiclink", email });
  if (error || !data.properties?.hashed_token) {
    console.error("[startSession]", error?.message);
    return false;
  }
  const { error: otpError } = await (await createUserClient()).auth.verifyOtp({ type: "email", token_hash: data.properties.hashed_token });
  if (otpError) console.error("[startSession]", otpError.message);
  return !otpError;
}

/** The barangay's admin access code (ADMIN_SIGNUP_CODE). Too short or unset means admin sign-up is closed. */
function adminCodeMatches(code: string): boolean {
  const expected = process.env.ADMIN_SIGNUP_CODE ?? "";
  if (expected.length < 12) return false;
  const digest = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(digest(code), digest(expected));
}

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = parseForm(signInSchema, form);
  if ("state" in parsed) return parsed.state;
  const admin = createAdminClient();

  if (parsed.data.google_credential) {
    const google = await verifyGoogle(parsed.data.google_credential);
    if (!google) return { error: GOOGLE_FAILED };
    // A new Google account must go through sign-up first: that's where the role and consent are chosen.
    const { data: status, error } = await admin.rpc("auth_email_status", { p_email: google.email });
    if (error) return { error: "Could not check that account. Try again." };
    if (status === "none") return { error: `No account uses ${google.email} yet. Choose “Create an account” below to pick your role first.` };
    if (!(await startSession(google.email))) return { error: GOOGLE_FAILED };
    redirect("/");
  }

  const { email, password } = credentials.parse(parsed.data);
  const supabase = await createUserClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // Only on failure: say why, so an unregistered or Google-only email isn't told "wrong password".
    const { data: status } = await admin.rpc("auth_email_status", { p_email: email });
    if (status === "none")
      return { error: "No account uses this email yet. Create one below, or continue with Google.", fieldErrors: { email: "Not registered" } };
    if (status === "google")
      return { error: "This email signs in with Google. Use the Google button instead.", fieldErrors: { email: "Uses Google sign-in" } };
    return { error: "Wrong password for this email.", fieldErrors: { password: "Check your password and try again" } };
  }
  redirect("/");
}

// Accounts are created server-side as already confirmed: Supabase's built-in email sender
// allows only a few emails per hour, which would break a live demo. See ARCHITECTURE.md.
export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = parseForm(signUpSchema, form);
  if ("state" in parsed) return parsed.state;
  const v = parsed.data;

  let email: string;
  let password: string | undefined;
  let name = v.display_name.trim();
  if (v.google_credential) {
    const google = await verifyGoogle(v.google_credential);
    if (!google) return { error: GOOGLE_FAILED };
    email = google.email;
    name ||= google.name;
  } else {
    ({ email, password } = credentials.parse(v));
  }

  const listedAdmin = adminEmails().includes(email);
  if (v.role === "admin" && !listedAdmin && !adminCodeMatches(v.admin_code))
    return { error: "That admin access code isn't right.", fieldErrors: { admin_code: "Ask whoever set up Kuryentipid for your barangay" } };

  const admin = createAdminClient();
  // signup: "google" marks accounts without a password, so a failed password sign-in can say "use Google".
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    ...(!password && { app_metadata: { signup: "google" } }),
  });
  if (error) {
    const taken = /already|registered|exists/i.test(error.message);
    // Google already proved this email is theirs, so an existing account simply signs in.
    if (taken && v.google_credential) {
      if (!(await startSession(email))) return { error: GOOGLE_FAILED };
      redirect("/");
    }
    return taken
      ? { error: "That email already has an account. Sign in instead.", fieldErrors: { email: "Already registered" } }
      : { error: "Could not create the account. Try again." };
  }

  // The on_auth_user_created trigger made the profile + household; now apply the role and consent.
  const userId = data.user.id;
  const role: SignUpRole = listedAdmin ? "admin" : (v.role as SignUpRole);
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .update({ role, display_name: name.length >= 2 ? name : null, consented_at: new Date().toISOString() })
    .eq("id", userId)
    .select("barangay_id")
    .single();
  const { error: storeError } =
    role === "store" && profile
      ? await admin.from("stores").insert({ barangay_id: profile.barangay_id, name: v.store_name, owner_profile_id: userId })
      : { error: null };
  if (profileError || storeError) {
    // Don't leave a half-set-up account behind: remove it so the person can simply try again.
    console.error("[signUp]", profileError?.message ?? storeError?.message);
    await admin.auth.admin.deleteUser(userId);
    return { error: "Could not finish setting up the account. Try again." };
  }

  const signedIn = password
    ? !(await (await createUserClient()).auth.signInWithPassword({ email, password })).error
    : await startSession(email);
  redirect(signedIn ? "/" : "/login");
}

export async function signOut(): Promise<void> {
  const supabase = await createUserClient();
  await supabase.auth.signOut();
  redirect("/login");
}
