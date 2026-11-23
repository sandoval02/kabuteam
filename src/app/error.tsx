"use client";

import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { buttonStyles } from "@/components/ui";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center px-4 py-12">
      <p className="font-display text-[1.15rem] font-bold tracking-wide">Kuryentipid</p>
      <h1 className="mt-6 text-display font-semibold">Couldn&apos;t load this page.</h1>
      <p className="mt-2 text-muted">Check your connection and try again.</p>
      <div className="mt-6 flex flex-wrap gap-2">
        <button type="button" onClick={reset} className={buttonStyles.primary}>
          <RotateCcw size={18} strokeWidth={1.75} aria-hidden />
          Try again
        </button>
        <Link href="/" className={buttonStyles.secondary}>
          Go home
        </Link>
      </div>
    </main>
  );
}
