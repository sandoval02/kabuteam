"use client";

import { useContext, type ComponentProps, type ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
import { FormContext } from "./form-context";

const control =
  "w-full rounded-sm border bg-surface-2 px-3 text-text transition-colors duration-100 placeholder:text-muted hover:border-text aria-invalid:border-error aria-invalid:bg-error-bg";

function useFieldError(name: string | undefined, explicit?: string) {
  const ctx = useContext(FormContext);
  return { error: explicit ?? (name ? ctx?.errors[name] : undefined), ctx };
}

function Message({ id, error, hint }: { id: string; error?: string; hint?: string }) {
  if (!error && !hint) return null;
  return (
    <p id={`${id}-hint`} aria-live="polite" className={`flex items-start gap-1 text-small ${error ? "text-error" : "text-muted"}`}>
      {error && <TriangleAlert size={12} aria-hidden className="mt-0.5 shrink-0" />}
      {error ?? hint}
    </p>
  );
}

type FieldProps = ComponentProps<"input"> & { label: string; hint?: string; error?: string; inputClassName?: string };

/** Label + input + live error. Reads its error from the surrounding ValidatedForm by name. */
export function Field({ label, hint, error: explicit, id, className = "", inputClassName = "h-10 text-[0.9375rem]", onBlur, onChange, ...props }: FieldProps) {
  const fieldId = id ?? props.name ?? label;
  const { error, ctx } = useFieldError(props.name, explicit);
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={fieldId} className="text-small font-semibold">
        {label}
        {props.required && <span className="text-muted"> *</span>}
      </label>
      <input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={hint || error ? `${fieldId}-hint` : undefined}
        className={`${control} ${error ? "border-error" : "border-border-strong"} ${inputClassName}`}
        onBlur={(e) => {
          if (props.name) ctx?.onBlur(props.name);
          onBlur?.(e);
        }}
        onChange={(e) => {
          onChange?.(e);
          if (props.name) ctx?.onChange(props.name);
        }}
        {...props}
      />
      <Message id={fieldId} error={error} hint={hint} />
    </div>
  );
}

type SelectProps = ComponentProps<"select"> & { label: string; hint?: string; children: ReactNode };

export function SelectField({ label, hint, id, className = "", children, onBlur, onChange, ...props }: SelectProps) {
  const fieldId = id ?? props.name ?? label;
  const { error, ctx } = useFieldError(props.name);
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={fieldId} className="text-small font-semibold">
        {label}
      </label>
      <select
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={hint || error ? `${fieldId}-hint` : undefined}
        className={`${control} h-10 text-[0.9375rem] ${error ? "border-error" : "border-border-strong"}`}
        onBlur={(e) => {
          if (props.name) ctx?.onBlur(props.name);
          onBlur?.(e);
        }}
        onChange={(e) => {
          onChange?.(e);
          if (props.name) ctx?.onChange(props.name);
        }}
        {...props}
      >
        {children}
      </select>
      <Message id={fieldId} error={error} hint={hint} />
    </div>
  );
}
