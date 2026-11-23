import { NextResponse } from "next/server";
import { createAdminClient, createUserClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin-emails";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const failed = () => NextResponse.redirect(new URL("/login?error=google", url.origin));
  if (!code) return failed();

  const supabase = await createUserClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return failed();

  if (data.user.email && isAdminEmail(data.user.email)) {
    await createAdminClient().from("profiles").update({ role: "admin" }).eq("id", data.user.id);
  }

  return NextResponse.redirect(new URL("/", url.origin));
}
