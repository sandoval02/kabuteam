"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { ChevronDown, House, Landmark, Store } from "lucide-react";
import { Field } from "@/components/ui";
import { FormContext } from "@/components/form-context";
import type { SignUpRole } from "@/lib/validation";

const OPTIONS = [
  { value: "resident", label: "Household", sub: "Scan your bill and join the ranking", Icon: House },
  { value: "store", label: "Sari-sari store", sub: "Accept vouchers at your counter", Icon: Store },
  { value: "admin", label: "Barangay admin", sub: "Review bills and issue vouchers", Icon: Landmark },
] as const;

const row =
  "group flex min-h-14 cursor-pointer items-center gap-3 rounded-sm border border-border-strong bg-surface-2 px-3 py-2 transition-colors duration-100 hover:border-text has-checked:border-lime has-checked:bg-lime has-checked:text-on-lime has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary";

/** "I'm joining as": the account's role, plus the one extra field that role needs. */
export function RoleFields({ initial }: { initial: SignUpRole }) {
  const [role, setRole] = useState<SignUpRole>(initial);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLFieldSetElement>(null);
  const refocus = useRef(false);
  const ctx = useContext(FormContext);
  const current = OPTIONS.find((option) => option.value === role) ?? OPTIONS[0];

  // The open menu focuses the chosen row; a click anywhere else folds it away.
  useEffect(() => {
    if (open) {
      list.current?.querySelector<HTMLInputElement>("input:checked")?.focus();
    } else if (refocus.current) {
      refocus.current = false;
      trigger.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);

  function close() {
    refocus.current = true;
    setOpen(false);
  }

  return (
    <>
      <div
        ref={root}
        className="relative"
        onBlur={(event) => {
          if (!open || event.currentTarget.contains(event.relatedTarget as Node | null)) return;
          // Some browsers report no relatedTarget while focus moves between rows;
          // check again after the click or Tab has finished.
          window.setTimeout(() => {
            if (!root.current?.contains(document.activeElement)) setOpen(false);
          }, 0);
        }}
        onKeyDown={(event) => {
          if (open && event.key === "Escape") {
            event.stopPropagation();
            close();
          }
        }}
      >
        <span id="role-label" className="mb-1.5 block text-small font-semibold">
          I&apos;m joining as
        </span>
        <button
          ref={trigger}
          type="button"
          hidden={open}
          aria-labelledby="role-label role-value"
          aria-describedby="role-sub"
          aria-expanded={open}
          aria-controls="role-options"
          onClick={() => setOpen(!open)}
          className="flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-sm border border-lime bg-lime px-3 py-2 text-left text-on-lime transition-colors duration-100 hover:bg-lime-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <current.Icon size={20} strokeWidth={1.75} aria-hidden className="shrink-0" />
          <span className="min-w-0 flex-1">
            <span id="role-value" className="block font-semibold">
              {current.label}
            </span>
            <span id="role-sub" className="block text-small">
              {current.sub}
            </span>
          </span>
          <ChevronDown
            size={20}
            strokeWidth={1.75}
            aria-hidden
            className={`shrink-0 transition-transform duration-100 ${open ? "rotate-180" : ""}`}
          />
        </button>
        <fieldset
          ref={list}
          id="role-options"
          hidden={!open}
          className="flex flex-col gap-1.5"
        >
          <legend className="sr-only">I&apos;m joining as</legend>
          {OPTIONS.map(({ value, label, sub, Icon }) => (
            <label key={value} className={row}>
              <input
                type="radio"
                name="role"
                value={value}
                checked={role === value}
                onChange={() => {
                  setRole(value);
                  ctx?.onChange("role");
                  close();
                }}
                onClick={() => {
                  if (role === value) close();
                }}
                className="sr-only"
              />
              <Icon size={20} strokeWidth={1.75} aria-hidden className="shrink-0" />
              <span className="min-w-0">
                <span className="block font-semibold">{label}</span>
                <span className="block text-small text-muted group-has-checked:text-on-lime">{sub}</span>
              </span>
            </label>
          ))}
        </fieldset>
      </div>
      {role === "store" && (
        <Field
          label="Store name"
          name="store_name"
          required
          maxLength={60}
          placeholder="e.g. Aling Nena Sari-sari Store"
          hint="Your barangay admin approves the store before vouchers can go to it."
        />
      )}
      {role === "admin" && (
        <Field
          label="Admin access code"
          name="admin_code"
          type="password"
          autoComplete="off"
          required
          hint="Ask whoever set up Kuryentipid for your barangay."
        />
      )}
    </>
  );
}
