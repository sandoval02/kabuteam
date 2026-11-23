import Link from "next/link";
import { cookies } from "next/headers";
import { getViewer } from "@/lib/auth";
import { UserMenu } from "./user-menu";
import type { ThemeChoice } from "@/app/theme-actions";

export async function currentTheme(): Promise<ThemeChoice> {
  const t = (await cookies()).get("theme")?.value;
  return t === "light" || t === "dark" ? t : "system";
}

function greeting(): string {
  const hour = Number(new Intl.DateTimeFormat("en-PH", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Manila" }).format(new Date()));
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

/**
 * Neobank-style top bar: logo mark, then either a greeting ("Good morning, Juan") or a page title,
 * with the place underneath, and the avatar menu on the right. Sticky with a soft blur.
 */
export async function AppHeader({ title, sub }: { title?: string; sub?: string }) {
  const [viewer, theme] = await Promise.all([getViewer(), currentTheme()]);
  const first = viewer?.displayName?.split(" ")[0];
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-2.5 bg-bg/85 px-4 backdrop-blur-xl">
      <Link
        href="/"
        aria-label="TipidTayo home"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-lime font-display text-[0.95rem] font-bold text-on-lime"
      >
        T
      </Link>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate font-display text-[1rem] font-semibold">{title ?? (first ? `${greeting()}, ${first}` : greeting())}</p>
        <p className="truncate text-[0.8125rem] text-muted">{sub ?? (viewer ? `${viewer.householdLabel} · ${viewer.barangayName}` : "")}</p>
      </div>
      {viewer && (
        <UserMenu
          name={viewer.displayName ?? viewer.householdLabel}
          email={viewer.email}
          initials={viewer.initials}
          avatarUrl={viewer.avatarUrl}
          theme={theme}
        />
      )}
    </header>
  );
}
