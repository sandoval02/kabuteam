import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient, createUserClient } from "@/lib/supabase/server";
import { adminEmails } from "@/lib/auth";

// Google sends the user back here with a one-time code; swap it for a session cookie.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const supabase = await createUserClient();
  const { data, error } = code ? await supabase.auth.exchangeCodeForSession(code) : { data: null, error: true };
  if (error || !data?.user) return NextResponse.redirect(`${origin}/login?error=google`);

  // The on_auth_user_created trigger already made the profile + household. Fill the name from
  // Google if the person hasn't set one, and apply ADMIN_EMAILS like password sign-up does.
  const { user } = data;
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("display_name, role").eq("id", user.id).single();
  const googleName = String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? "").trim().slice(0, 60);
  const update = {
    ...(!profile?.display_name && googleName.length >= 2 && { display_name: googleName }),
    ...(profile?.role === "resident" && adminEmails().includes((user.email ?? "").toLowerCase()) && { role: "admin" }),
  };
  if (Object.keys(update).length) await admin.from("profiles").update(update).eq("id", user.id);

  return NextResponse.redirect(`${origin}/`);
}
