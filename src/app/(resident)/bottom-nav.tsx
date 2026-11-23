"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { House, ScanLine, Trophy, Ticket, LoaderCircle, type LucideIcon } from "lucide-react";

const ITEMS = [
  { href: "/home", label: "Home", Icon: House },
  { href: "/scan", label: "Scan", Icon: ScanLine },
  { href: "/ranking", label: "Ranking", Icon: Trophy },
  { href: "/vouchers", label: "Vouchers", Icon: Ticket },
];

// Must render inside <Link>: useLinkStatus reports that link's pending navigation.
function NavIcon({ Icon, active }: { Icon: LucideIcon; active: boolean }) {
  const { pending } = useLinkStatus();
  const Shown = pending ? LoaderCircle : Icon;
  return (
    <span className={`flex h-6 w-10 items-center justify-center rounded-full transition-colors duration-100 ${active || pending ? "bg-primary-soft text-primary" : ""}`}>
      <Shown size={18} strokeWidth={1.75} className={pending ? "animate-spin" : undefined} aria-hidden />
    </span>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-4 bottom-[max(0.625rem,env(safe-area-inset-bottom))] mx-auto max-w-[400px] rounded-full bg-surface/90 shadow-sheet backdrop-blur-xl backdrop-saturate-150"
    >
      <ul className="grid grid-cols-4 px-2 py-1.5">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex h-14 flex-col items-center justify-center gap-0.5 text-[0.6875rem] leading-none ${active ? "font-semibold text-primary" : "text-muted"}`}
              >
                <NavIcon Icon={Icon} active={active} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
