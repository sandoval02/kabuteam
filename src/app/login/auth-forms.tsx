"use client";

import { useActionState, useState } from "react";
import { Field, Notice } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { signIn, signUp, type AuthState } from "./actions";

export function AuthForms({ initialMode = "in" }: { initialMode?: "in" | "up" }) {
  const [mode, setMode] = useState<"in" | "up">(initialMode);
  const [inState, inAction] = useActionState<AuthState, FormData>(signIn, {});
  const [upState, upAction] = useActionState<AuthState, FormData>(signUp, {});
  const state = mode === "in" ? inState : upState;

  return (
    <div className="mt-8 rounded-md border border-border bg-surface p-4">
      <div role="tablist" aria-label="Account" className="mb-4 grid grid-cols-2 gap-1 rounded-sm bg-bg p-1">
        {(["in", "up"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`h-11 cursor-pointer rounded-sm font-semibold ${mode === m ? "bg-surface text-text shadow-receipt" : "text-muted"}`}
          >
            {m === "in" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>
      <form action={mode === "in" ? inAction : upAction} className="flex flex-col gap-4" key={mode}>
        {state.error && <Notice tone="error">{state.error}</Notice>}
        <Field label="Email" name="email" type="email" autoComplete="email" required defaultValue={state.email} />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete={mode === "in" ? "current-password" : "new-password"}
          minLength={8}
          required
          hint={mode === "up" ? "At least 8 characters" : undefined}
        />
        <SubmitButton pendingText={mode === "in" ? "Signing in…" : "Creating account…"}>
          {mode === "in" ? "Sign in" : "Create account"}
        </SubmitButton>
      </form>
    </div>
  );
}
