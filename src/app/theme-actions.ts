"use server";

import { cookies } from "next/headers";

export type ThemeChoice = "light" | "dark" | "system";

/** Saves the theme in a cookie so the server renders the right theme with no flash. */
export async function saveTheme(theme: ThemeChoice) {
  const jar = await cookies();
  if (theme === "system") jar.delete("theme");
  else jar.set("theme", theme, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}
