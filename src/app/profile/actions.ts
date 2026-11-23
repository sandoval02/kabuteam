"use server";

import { revalidatePath } from "next/cache";
import { requireViewer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { displayName, parseForm, type FormState } from "@/lib/validation";

const TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024;

export async function updateName(_: FormState, form: FormData): Promise<FormState> {
  const viewer = await requireViewer();
  const parsed = parseForm(displayName, form);
  if ("state" in parsed) return parsed.state;
  const value = parsed.data.display_name || null;
  const { error } = await createAdminClient().from("profiles").update({ display_name: value }).eq("id", viewer.userId);
  if (error) return { error: "Could not save your name. Try again." };
  revalidatePath("/", "layout");
  return { ok: value ? "Name saved." : "Name removed." };
}

async function currentAvatarPath(userId: string) {
  const { data } = await createAdminClient().from("profiles").select("avatar_path").eq("id", userId).single();
  return data?.avatar_path ?? null;
}

export async function uploadAvatar(_: FormState, form: FormData): Promise<FormState> {
  const viewer = await requireViewer();
  const file = form.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a photo first." };
  if (!TYPES.includes(file.type)) return { error: "Use a JPEG, PNG or WebP photo." };
  if (file.size > MAX_BYTES) return { error: "Photo is larger than 2 MB." };

  const admin = createAdminClient();
  const path = `${viewer.userId}/${crypto.randomUUID()}.jpg`;
  const { error } = await admin.storage.from("avatars").upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type });
  if (error) {
    console.error("[uploadAvatar]", error);
    return { error: "Could not upload the photo. Try again." };
  }
  const old = await currentAvatarPath(viewer.userId);
  await admin.from("profiles").update({ avatar_path: path }).eq("id", viewer.userId);
  if (old) await admin.storage.from("avatars").remove([old]);
  revalidatePath("/", "layout");
  return { ok: "Photo updated." };
}

export async function removeAvatar(): Promise<FormState> {
  const viewer = await requireViewer();
  const admin = createAdminClient();
  const old = await currentAvatarPath(viewer.userId);
  if (!old) return { error: "There is no photo to remove." };
  await admin.from("profiles").update({ avatar_path: null }).eq("id", viewer.userId);
  await admin.storage.from("avatars").remove([old]);
  revalidatePath("/", "layout");
  return { ok: "Photo removed." };
}
