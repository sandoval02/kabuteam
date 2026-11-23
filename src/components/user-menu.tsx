"use client";

import Link from "next/link";
import { LogOut, UserRound } from "lucide-react";
import { Avatar } from "./avatar";
import { ValidatedForm } from "./form";
import { ThemeSwitcher } from "./theme-switcher";
import { signOut } from "@/app/login/actions";
import type { ThemeChoice } from "@/app/theme-actions";

type Props = { name: string; email: string; initials: string; avatarUrl: string | null; theme: ThemeChoice };

/** Avatar button that opens a menu (native popover: closes on outside click and Esc). */
export function UserMenu({ name, email, initials, avatarUrl, theme }: Props) {
  return (
    <>
      <button
        type="button"
        popoverTarget="user-menu"
        aria-label="Open account menu"
        className="cursor-pointer rounded-full transition-transform duration-100 active:scale-95"
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
        <ValidatedForm action={signOut} className="contents">
          <button
            type="submit"
            data-confirm-title="Sign out?"
            data-confirm-body="You'll need your email and password to sign in again."
            data-confirm-label="Sign out"
            data-confirm-tone="destructive"
            className="flex h-10 w-full cursor-pointer items-center gap-2.5 rounded-sm px-2 font-semibold text-error hover:bg-error-bg"
          >
            <LogOut size={14} strokeWidth={1.75} aria-hidden />
            Sign out
          </button>
        </ValidatedForm>
      </div>
    </>
  );
}
