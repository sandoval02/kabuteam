import Image from "next/image";
import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { currentTheme } from "@/lib/theme";
import { UserMenu } from "./user-menu";

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
      <Link href="/" aria-label="Kuryentipid home" className="shrink-0">
        <Image src="/logo.png" alt="" width={36} height={36} priority />
      </Link>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate font-display text-body font-semibold">{title ?? (first ? `${greeting()}, ${first}` : greeting())}</p>
        <p className="truncate text-small text-muted">{sub ?? (viewer ? `${viewer.householdLabel} · ${viewer.barangayName}` : "")}</p>
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
