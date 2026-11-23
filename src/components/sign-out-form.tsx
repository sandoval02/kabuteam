"use client";

import { useRef, useState } from "react";
import { LogOut } from "lucide-react";
import { signOut } from "@/app/login/actions";
import { ConfirmDialog } from "./confirm-dialog";

/**
 * Sign-out uses the same confirmation dialog as the rest of the app, but without
 * pulling the full validated-form layer into every page that shows the header.
 */
export function SignOutForm({
  className = "flex h-10 w-full cursor-pointer items-center gap-2.5 rounded-sm px-2 font-semibold text-error hover:bg-error-bg",
}: {
  className?: string;
}) {
  const form = useRef<HTMLFormElement>(null);
  const [confirm, setConfirm] = useState(false);

  return (
    <>
      <form ref={form} action={signOut} className="contents">
        <button type="button" onClick={() => setConfirm(true)} className={className}>
          <LogOut size={14} strokeWidth={1.75} aria-hidden />
          Sign out
        </button>
      </form>
      <ConfirmDialog
        config={
          confirm
            ? {
                title: "Sign out?",
                body: "You'll need your email and password to sign in again.",
                label: "Sign out",
                tone: "destructive",
              }
            : null
        }
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          form.current?.requestSubmit();
        }}
      />
    </>
  );
}
