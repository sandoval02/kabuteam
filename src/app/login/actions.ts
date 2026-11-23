"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { credentials, parseForm, signUp as signUpSchema, type FormState } from "@/lib/validation";
import { createAdminClient, createUserClient } from "@/lib/supabase/server";
import { adminEmails } from "@/lib/auth";

export type AuthState = FormState;

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = parseForm(credentials, form);
  if ("state" in parsed) return parsed.state;
  const supabase = await createUserClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    // Only on failure: say why, so an unregistered or Google-only email isn't told "wrong password".
    const { data: status } = await createAdminClient().rpc("auth_email_status", { p_email: parsed.data.email });
    if (status === "none")
      return { error: "No account uses this email yet. Create one below, or continue with Google.", fieldErrors: { email: "Not registered" } };
    if (status === "google")
      return { error: "This email signs in with Google. Use “Continue with Google” instead.", fieldErrors: { email: "Uses Google sign-in" } };
    return { error: "Wrong password for this email.", fieldErrors: { password: "Check your password and try again" } };
  }
  redirect("/");
}

// Accounts are created server-side as already confirmed: Supabase's built-in email sender
// allows only a few emails per hour, which would break a live demo. See ARCHITECTURE.md.
export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = parseForm(signUpSchema, form);
  if ("state" in parsed) return parsed.state;
  const { email, password, display_name } = parsed.data;

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) {
    const taken = /already|registered|exists/i.test(error.message);
    return taken
      ? { error: "That email already has an account. Sign in instead.", fieldErrors: { email: "Already registered" } }
      : { error: "Could not create the account. Try again." };
  }
  const isAdmin = adminEmails().includes(email);
  if (isAdmin || display_name) {
    await admin
      .from("profiles")
      .update({ display_name: display_name || null, ...(isAdmin && { role: "admin" }) })
      .eq("id", data.user.id);
  }

  const supabase = await createUserClient();
  await supabase.auth.signInWithPassword({ email, password });
  redirect("/");
}

/** Starts Google sign-in. New Google users get an account automatically; /auth/callback finishes it. */
export async function signInWithGoogle(): Promise<FormState> {
  const origin = (await headers()).get("origin");
  const supabase = await createUserClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback` },
  });
  if (error || !data.url) return { error: "Google sign-in isn't available right now. Use your email and password." };
  redirect(data.url);
}

export async function signOut(): Promise<FormState> {
  const supabase = await createUserClient();
  await supabase.auth.signOut();
  redirect("/login");
}
