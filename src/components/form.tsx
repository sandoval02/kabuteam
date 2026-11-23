"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Notice, buttonStyles } from "./ui";
import { FormContext } from "./form-context";
import { fieldErrorsOf, schemas, type FieldErrors, type FormState, type SchemaKey } from "@/lib/validation";


type Confirm = { title: string; body: string; label: string; tone: "primary" | "destructive" };

/**
 * A form that validates each field as you leave it (and again on submit) with the shared zod rules,
 * shows a toast on success, and asks for confirmation when the clicked submit button carries
 * data-confirm-title / data-confirm-body / data-confirm-label / data-confirm-tone.
 */
export function ValidatedForm({
  action,
  schema,
  className = "flex flex-col gap-4",
  children,
  onResult,
  resetOnSuccess = false,
}: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  schema?: SchemaKey;
  className?: string;
  children: ReactNode;
  onResult?: (result: FormState) => void;
  resetOnSuccess?: boolean;
}) {
  const form = useRef<HTMLFormElement>(null);
  const touched = useRef(new Set<string>());
  const confirmed = useRef(false);
  const submitter = useRef<HTMLButtonElement | null>(null);
  const lastData = useRef<FormData | null>(null);
  const [clientErrors, setClientErrors] = useState<FieldErrors>({});
  const [confirm, setConfirm] = useState<Confirm | null>(null);

  const [state, formAction] = useActionState(async (prev: FormState, data: FormData) => {
    lastData.current = data;
    const result = await action(prev, data);
    if (result.ok) {
      toast.success(result.ok);
      if (resetOnSuccess) {
        form.current?.reset();
        touched.current.clear();
      }
    }
    onResult?.(result);
    return result;
  }, {});

  // React clears a form after its action runs; on a server error, put the person's input back.
  useEffect(() => {
    if (!(state.error || state.fieldErrors) || !lastData.current || !form.current) return;
    const data = lastData.current;
    const el = form.current;
    const t = setTimeout(() => {
      data.forEach((value, key) => {
        const input = el.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${key}"]:not([type=hidden]):not([type=password])`);
        if (input && typeof value === "string") input.value = value;
      });
    }, 0);
    return () => clearTimeout(t);
  }, [state]);

  const check = (name: string) => {
    if (!schema || !form.current) return;
    const errs = fieldErrorsOf(schemas[schema], Object.fromEntries(new FormData(form.current))) ?? {};
    setClientErrors((prev) => ({ ...prev, [name]: errs[name] }));
  };

  // A field edited since the last submit shows its live client error; otherwise the server's.
  const errors: FieldErrors = { ...state.fieldErrors };
  for (const [k, v] of Object.entries(clientErrors)) errors[k] = v;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    const btn = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    if (schema) {
      const errs = fieldErrorsOf(schemas[schema], Object.fromEntries(new FormData(e.currentTarget)));
      if (errs) {
        e.preventDefault();
        setClientErrors(errs);
        const first = Object.keys(errs).find((k) => e.currentTarget.querySelector(`[name="${k}"]:not([type=hidden])`));
        if (first) e.currentTarget.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
        return;
      }
    }
    setClientErrors({});
    if (btn?.dataset.confirmTitle && !confirmed.current) {
      e.preventDefault();
      submitter.current = btn;
      setConfirm({
        title: btn.dataset.confirmTitle,
        body: btn.dataset.confirmBody ?? "",
        label: btn.dataset.confirmLabel ?? "Confirm",
        tone: btn.dataset.confirmTone === "destructive" ? "destructive" : "primary",
      });
      return;
    }
    confirmed.current = false;
  }

  return (
    <>
      <FormContext.Provider
        value={{
          errors,
          onBlur: (name) => {
            touched.current.add(name);
            check(name);
          },
          onChange: (name) => {
            if (touched.current.has(name) || clientErrors[name]) check(name);
          },
        }}
      >
        <form ref={form} action={formAction} onSubmit={onSubmit} noValidate className={className}>
          {state.error && <Notice tone="error">{state.error}</Notice>}
          {children}
        </form>
      </FormContext.Provider>
      <ConfirmDialog
        config={confirm}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          confirmed.current = true;
          setConfirm(null);
          form.current?.requestSubmit(submitter.current ?? undefined);
        }}
      />
    </>
  );
}

/** Native <dialog>: focus trap, Esc to close and an inert page come from the browser. */
export function ConfirmDialog({ config, onCancel, onConfirm }: { config: Confirm | null; onCancel: () => void; onConfirm: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (config && !d.open) d.showModal();
    if (!config && d.open) d.close();
  }, [config]);

  return (
    <dialog
      ref={ref}
      onClose={onCancel}
      aria-labelledby="confirm-title"
      className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-lg bg-surface p-0 text-text shadow-sheet backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      {config && (
        <div className="p-5">
          <h2 id="confirm-title" className="text-h2 font-semibold">
            {config.title}
          </h2>
          {config.body && <p className="mt-2 text-muted">{config.body}</p>}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" autoFocus className={buttonStyles.secondary} onClick={() => ref.current?.close()}>
              Cancel
            </button>
            <button type="button" className={config.tone === "destructive" ? buttonStyles.destructive : buttonStyles.primary} onClick={onConfirm}>
              {config.label}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}

/** Turns a one-shot ?param=value from a redirect into a toast, then removes it from the URL. */
export function ToastFromParam({ param, messages }: { param: string; messages: Record<string, { text: string; tone?: "success" | "warning" }> }) {
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const value = search.get(param);
  useEffect(() => {
    if (!value || !messages[value]) return;
    const m = messages[value];
    if (m.tone === "warning") toast.warning(m.text);
    else toast.success(m.text);
    router.replace(pathname, { scroll: false });
  }, [value, messages, router, pathname]);
  return null;
}
