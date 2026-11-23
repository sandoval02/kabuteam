"use client";

import { useActionState } from "react";
import { Notice } from "./ui";

export type ActionState = { error?: string; ok?: string };

/** A form that runs a server action and shows its success or error message inline. */
export function ActionForm({
  action,
  children,
  className = "flex flex-col gap-4",
}: {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className={className}>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.ok && <Notice tone="success">{state.ok}</Notice>}
      {children}
    </form>
  );
}
