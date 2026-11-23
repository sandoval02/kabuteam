"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient, createUserClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; email?: string };

const Credentials = z.object({
  email: z.email("Enter a valid email").transform((e) => e.trim().toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const adminEmails = () =>
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "");
  const parsed = Credentials.safeParse({ email, password: form.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0].message, email };
  const supabase = await createUserClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "Wrong email or password.", email };
  redirect("/");
}

// Accounts are created server-side as already confirmed: Supabase's built-in email sender
// allows only a few emails per hour, which would break a live demo. See ARCHITECTURE.md.
export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "");
  const parsed = Credentials.safeParse({ email, password: form.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0].message, email };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({ ...parsed.data, email_confirm: true });
  if (error) {
    const taken = /already|registered|exists/i.test(error.message);
    return {
      error: taken ? "That email already has an account. Sign in instead." : "Could not create the account. Try again.",
      email,
    };
  }
  if (adminEmails().includes(parsed.data.email)) {
    await admin.from("profiles").update({ role: "admin" }).eq("id", data.user.id);
  }

  const supabase = await createUserClient();
  await supabase.auth.signInWithPassword(parsed.data);
  redirect("/");
}

export async function signOut() {
  const supabase = await createUserClient();
  await supabase.auth.signOut();
  redirect("/login");
}
