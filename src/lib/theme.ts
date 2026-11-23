import "server-only";
import { cookies } from "next/headers";

export type ThemeChoice = "light" | "dark" | "system";

/** The saved theme, so the server can render the right palette without a flash. */
export async function currentTheme(): Promise<ThemeChoice> {
  const value = (await cookies()).get("theme")?.value;
  return value === "light" || value === "dark" ? value : "system";
}
