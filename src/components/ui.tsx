import type { ComponentProps, ReactNode } from "react";
import { TriangleAlert, CircleCheck, Info, ArrowRight, type LucideIcon } from "lucide-react";

const nf1 = new Intl.NumberFormat("en-PH", { maximumFractionDigits: 1 });
export const peso = (n: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 }).format(n);
export const kwh = (n: number) => `${nf1.format(n)} kWh`;
export const pct = (n: number) => `${nf1.format(n)}%`;

const buttonBase =
  "inline-flex h-10 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 text-[0.9375rem] font-bold transition-[background-color,border-color,transform] duration-200 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60";
export const buttonStyles = {
  primary: `${buttonBase} bg-primary text-on-primary hover:bg-primary-hover`,
  secondary: `${buttonBase} border-[1.5px] border-border bg-surface text-text hover:border-text`,
  lime: `${buttonBase} bg-lime text-on-lime hover:bg-lime-hover`,
  ghost: `${buttonBase} text-text hover:bg-surface-2`,
  destructive: `${buttonBase} bg-error text-on-primary hover:opacity-90`,
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: keyof typeof buttonStyles }) {
  return <button className={`${buttonStyles[variant]} ${className}`} {...props} />;
}

export { Field, SelectField } from "./field";

const noticeStyles = {
  success: { box: "bg-success-bg text-success", Icon: CircleCheck },
  warning: { box: "bg-warning-bg text-warning", Icon: TriangleAlert },
  error: { box: "bg-error-bg text-error", Icon: TriangleAlert },
  info: { box: "border border-border bg-surface text-muted", Icon: Info },
};
export function Notice({ tone, children }: { tone: keyof typeof noticeStyles; children: ReactNode }) {
  const { box, Icon } = noticeStyles[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`flex gap-2 rounded-sm px-3 py-2.5 text-small ${box}`}>
      <Icon size={18} aria-hidden className="mt-px shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <header className="mb-4">
      <h1 className="text-display font-semibold">{children}</h1>
      {sub && <p className="mt-1 text-muted">{sub}</p>}
    </header>
  );
}

export function Section({ title, children, action, icon, id }: { title: string; children: ReactNode; action?: ReactNode; icon?: LucideIcon; id?: string }) {
  return (
    <section id={id} className="mb-6 scroll-mt-16">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-3 text-h2 font-semibold">
          {icon && <IconTile icon={icon} />}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Label + arrow in a circle, the main call-to-action shape. Put inside a primary button or link. */
export function CtaLabel({ children }: { children: ReactNode }) {
  return (
    <>
      <span>{children}</span>
      <ArrowRight size={18} strokeWidth={2.25} aria-hidden />
    </>
  );
}

/** A tinted rounded square holding one icon. */
export function IconTile({ icon: Icon, tone = "green", size = "md" }: { icon: LucideIcon; tone?: "green" | "gold" | "warning"; size?: "md" | "lg" }) {
  const tones = { green: "bg-surface-2 text-text", gold: "bg-lime text-on-lime", warning: "bg-warning-bg text-warning" };
  const dims = size === "lg" ? "h-10 w-10 rounded-md" : "h-8 w-8 rounded-md";
  return (
    <span aria-hidden className={`flex shrink-0 items-center justify-center ${dims} ${tones[tone]}`}>
      <Icon size={size === "lg" ? 17 : 14} strokeWidth={1.75} />
    </span>
  );
}

/** White soft-shadow card, the default container. */
export function Card({ className = "", children, ...props }: ComponentProps<"div">) {
  return (
    <div className={`rounded-md bg-surface p-3.5 shadow-receipt ${className}`} {...props}>
      {children}
    </div>
  );
}
