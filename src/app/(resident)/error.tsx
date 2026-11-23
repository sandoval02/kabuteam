"use client";

import { RotateCcw } from "lucide-react";
import { buttonStyles } from "@/components/ui";

export default function ResidentError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mt-2 rounded-md bg-surface p-4 shadow-receipt">
      <h1 className="text-h2 font-semibold">Couldn&apos;t load this screen.</h1>
      <p className="mt-1 text-muted">Check your connection and try again.</p>
      <button type="button" onClick={reset} className={`${buttonStyles.primary} mt-4`}>
        <RotateCcw size={18} strokeWidth={1.75} aria-hidden />
        Try again
      </button>
    </div>
  );
}
