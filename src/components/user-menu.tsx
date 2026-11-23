"use client";

import Link from "next/link";
import { UserRound } from "lucide-react";
import { Avatar } from "./avatar";
import { SignOutForm } from "./sign-out-form";
import { ThemeSwitcher } from "./theme-switcher";
import type { ThemeChoice } from "@/lib/theme";

type Props = { name: string; email: string; initials: string; avatarUrl: string | null; theme: ThemeChoice };

/** Avatar button that opens a menu (native popover: closes on outside click and Esc). */
export function UserMenu({ name, email, initials, avatarUrl, theme }: Props) {
  return (
    <>
      <button
        type="button"
        popoverTarget="user-menu"
        aria-label="Open account menu"
        className="cursor-pointer rounded-full p-1 transition-transform duration-100 active:scale-95"
      >
        <Avatar url={avatarUrl} initials={initials} />
      </button>
      <div
        id="user-menu"
        popover="auto"
        className="fixed inset-auto right-3 top-13 m-0 w-64 rounded-md bg-surface p-2 text-text shadow-sheet"
      >
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar url={avatarUrl} initials={initials} size={40} />
          <div className="min-w-0">
            <p className="truncate font-semibold">{name}</p>
            <p className="truncate text-small text-muted">{email}</p>
          </div>
        </div>
        <div className="my-1 h-px bg-border" />
        <Link href="/profile" className="flex h-10 items-center gap-2.5 rounded-sm px-2 font-semibold hover:bg-surface-2">
          <UserRound size={14} strokeWidth={1.75} aria-hidden />
          Profile
        </Link>
        <div className="px-2 py-2">
          <p className="mb-1.5 text-small text-muted">Theme</p>
          <ThemeSwitcher initial={theme} />
        </div>
        <div className="my-1 h-px bg-border" />
        <SignOutForm />
      </div>
    </>
  );
}
