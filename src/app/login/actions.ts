"use server";

import { redirect } from "next/navigation";
import { credentials, parseForm, type FormState } from "@/lib/validation";
import { createAdminClient, createUserClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin-emails";

export type AuthState = FormState;

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = parseForm(credentials, form);
  if ("state" in parsed) return parsed.state;
  const supabase = await createUserClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "Wrong email or password.", fieldErrors: { password: "Check your password and try again" } };
  redirect("/");
}

// Accounts are created server-side as already confirmed: Supabase's built-in email sender
// allows only a few emails per hour, which would break a live demo. See ARCHITECTURE.md.
export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = parseForm(credentials, form);
  if ("state" in parsed) return parsed.state;

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({ ...parsed.data, email_confirm: true });
  if (error) {
    const taken = /already|registered|exists/i.test(error.message);
    return taken
      ? { error: "That email already has an account. Sign in instead.", fieldErrors: { email: "Already registered" } }
      : { error: "Could not create the account. Try again." };
  }
  if (isAdminEmail(parsed.data.email)) {
    await admin.from("profiles").update({ role: "admin" }).eq("id", data.user.id);
  }

  const supabase = await createUserClient();
  await supabase.auth.signInWithPassword(parsed.data);
  redirect("/");
}

export async function signOut(): Promise<FormState> {
  const supabase = await createUserClient();
  await supabase.auth.signOut();
  redirect("/login");
}
