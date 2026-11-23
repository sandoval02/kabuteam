"use client";

import { useContext, useState } from "react";
import { House, Landmark, Store } from "lucide-react";
import { Field } from "@/components/ui";
import { FormContext } from "@/components/form-context";
import type { SignUpRole } from "@/lib/validation";

const OPTIONS = [
  { value: "resident", label: "Household", sub: "Scan your bill and join the ranking", Icon: House },
  { value: "store", label: "Sari-sari store", sub: "Accept vouchers at your counter", Icon: Store },
  { value: "admin", label: "Barangay admin", sub: "Review bills and issue vouchers", Icon: Landmark },
] as const;

/** "I'm joining as": the account's role, plus the one extra field that role needs. */
export function RoleFields({ initial }: { initial: SignUpRole }) {
  const [role, setRole] = useState<SignUpRole>(initial);
  const ctx = useContext(FormContext);
  return (
    <>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-small font-semibold">I&apos;m joining as</legend>
        {OPTIONS.map(({ value, label, sub, Icon }) => (
          <label
            key={value}
            className="group flex min-h-14 cursor-pointer items-center gap-3 rounded-sm border border-border-strong bg-surface-2 px-3 py-2 transition-colors duration-100 hover:border-text has-checked:border-lime has-checked:bg-lime has-checked:text-on-lime has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary"
          >
            <input
              type="radio"
              name="role"
              value={value}
              checked={role === value}
              onChange={() => {
                setRole(value);
                ctx?.onChange("role");
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
