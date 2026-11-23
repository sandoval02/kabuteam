import type { ComponentProps, ReactNode } from "react";
import { TriangleAlert, CircleCheck, Info } from "lucide-react";

const nf1 = new Intl.NumberFormat("en-PH", { maximumFractionDigits: 1 });
export const peso = (n: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 }).format(n);
export const kwh = (n: number) => `${nf1.format(n)} kWh`;
export const pct = (n: number) => `${nf1.format(n)}%`;

const buttonBase =
  "inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-sm px-4 font-semibold transition-colors duration-100 disabled:cursor-not-allowed disabled:opacity-60";
export const buttonStyles = {
  primary: `${buttonBase} bg-primary text-on-primary hover:bg-primary-hover`,
  secondary: `${buttonBase} border border-border-strong bg-surface text-text hover:bg-bg`,
  ghost: `${buttonBase} text-primary hover:bg-success-bg`,
  destructive: `${buttonBase} bg-error text-on-primary hover:opacity-90`,
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: keyof typeof buttonStyles }) {
  return <button className={`${buttonStyles[variant]} ${className}`} {...props} />;
}

type FieldProps = ComponentProps<"input"> & { label: string; hint?: string; error?: string };
export function Field({ label, hint, error, id, className = "", ...props }: FieldProps) {
  const fieldId = id ?? props.name;
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={fieldId} className="text-small font-semibold">
        {label}
      </label>
      <input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={hint || error ? `${fieldId}-hint` : undefined}
        className="h-11 rounded-sm border border-border-strong bg-surface px-3 text-body aria-invalid:border-error"
        {...props}
      />
      {(error || hint) && (
        <p id={`${fieldId}-hint`} className={`flex items-center gap-1 text-small ${error ? "text-error" : "text-muted"}`}>
          {error && <TriangleAlert size={16} aria-hidden />}
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

type SelectProps = ComponentProps<"select"> & { label: string; children: ReactNode };
export function SelectField({ label, id, className = "", children, ...props }: SelectProps) {
  const fieldId = id ?? props.name;
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={fieldId} className="text-small font-semibold">
        {label}
      </label>
      <select id={fieldId} className="h-11 rounded-sm border border-border-strong bg-surface px-3 text-body" {...props}>
        {children}
      </select>
    </div>
  );
}

const noticeStyles = {
  success: { box: "bg-success-bg text-success", Icon: CircleCheck },
  warning: { box: "bg-warning-bg text-warning", Icon: TriangleAlert },
  error: { box: "bg-error-bg text-error", Icon: TriangleAlert },
  info: { box: "border border-border bg-surface text-muted", Icon: Info },
};
export function Notice({ tone, children }: { tone: keyof typeof noticeStyles; children: ReactNode }) {
  const { box, Icon } = noticeStyles[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`flex gap-2 rounded-sm p-3 text-small ${box}`}>
      <Icon size={20} aria-hidden className="mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <header className="mb-6">
      <h1 className="text-display font-semibold">{children}</h1>
      {sub && <p className="mt-1 text-muted">{sub}</p>}
    </header>
  );
}

export function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-h2 font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
