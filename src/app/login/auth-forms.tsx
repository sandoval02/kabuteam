"use client";

import { useState } from "react";
import { Field } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { ValidatedForm } from "@/components/form";
import { signIn, signUp } from "./actions";

export function AuthForms({ initialMode = "in" }: { initialMode?: "in" | "up" }) {
  const [mode, setMode] = useState<"in" | "up">(initialMode);

  return (
    <div className="mt-8 rounded-md bg-surface p-4 shadow-receipt">
      <div role="group" aria-label="Account" className="mb-4 grid grid-cols-2 gap-1 rounded-full bg-surface-2 p-1">
        {(["in", "up"] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => setMode(m)}
            className={`h-11 cursor-pointer rounded-full font-semibold transition-colors duration-100 ${
              mode === m ? "bg-primary text-on-primary" : "text-muted hover:text-text"
            }`}
          >
            {m === "in" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>
      <ValidatedForm key={mode} action={mode === "in" ? signIn : signUp} schema="credentials">
        <Field label="Email" name="email" type="email" inputMode="email" autoComplete="email" required placeholder="juan@example.com" />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete={mode === "in" ? "current-password" : "new-password"}
          required
          hint={mode === "up" ? "At least 8 characters" : undefined}
        />
        <SubmitButton pendingText={mode === "in" ? "Signing in…" : "Creating account…"}>
          {mode === "in" ? "Sign in" : "Create account"}
        </SubmitButton>
      </ValidatedForm>
    </div>
  );
}
