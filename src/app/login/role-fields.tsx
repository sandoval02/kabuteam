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
  const ctx = useContext(FormContext);
  const current = OPTIONS.find((option) => option.value === role) ?? OPTIONS[0];

  // Opening puts the keyboard on the chosen row so arrows and Space work at once.
  useEffect(() => {
    if (open) list.current?.querySelector<HTMLInputElement>("input:checked")?.focus();
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
    setOpen(false);
    trigger.current?.focus();
  }

  function choose(value: SignUpRole) {
    setRole(value);
    ctx?.onChange("role");
    close();
  }

  return (
    <>
      <div
        ref={root}
        className="relative"
        onBlur={(event) => {
          // Tab past the group closes it; a blur with no next target is left alone
          // so the click that follows still reaches the row.
          const next = event.relatedTarget as Node | null;
          if (open && next && !event.currentTarget.contains(next)) setOpen(false);
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
          aria-labelledby="role-label role-value"
          aria-expanded={open}
          aria-controls="role-options"
          onClick={() => setOpen(!open)}
          className="flex h-10 w-full cursor-pointer items-center gap-2.5 rounded-sm border border-border-strong bg-surface-2 px-3 text-left transition-colors duration-100 hover:border-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <current.Icon size={20} strokeWidth={1.75} aria-hidden className="shrink-0" />
          <span id="role-value" className="min-w-0 flex-1 font-semibold">
            {current.label}
          </span>
          <ChevronDown
            size={20}
            strokeWidth={1.75}
            aria-hidden
            className={`shrink-0 text-muted transition-transform duration-100 ${open ? "rotate-180" : ""}`}
          />
        </button>
        <fieldset
          ref={list}
          id="role-options"
          hidden={!open}
          className="mt-1.5 flex flex-col gap-1.5"
        >
          <legend className="sr-only">I&apos;m joining as</legend>
          {OPTIONS.map(({ value, label, sub, Icon }) => (
            <label key={value} className={row} onClick={() => choose(value)}>
              <input
                type="radio"
                name="role"
                value={value}
                checked={role === value}
                onChange={() => choose(value)}
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
