"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ScanLine, ReceiptText, Trophy, Ticket } from "lucide-react";

const ITEMS = [
  { href: "/scan", label: "Scan", Icon: ScanLine },
  { href: "/receipt", label: "Receipt", Icon: ReceiptText },
  { href: "/ranking", label: "Ranking", Icon: Trophy },
  { href: "/vouchers", label: "Vouchers", Icon: Ticket },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid max-w-[480px] grid-cols-4">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex h-16 flex-col items-center justify-center gap-1 text-small ${active ? "font-semibold text-primary" : "text-muted"}`}
              >
                <Icon size={24} strokeWidth={1.75} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
