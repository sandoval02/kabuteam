"use client";

import { useEffect, useRef, useState } from "react";
import { peso } from "@/components/ui";

/** "This issue: up to 3 × ₱50 = ₱150", updated as the admin types in the surrounding form. */
export function IssueTotal({ defaultCount, defaultAmount }: { defaultCount: number; defaultAmount: number }) {
  const line = useRef<HTMLParagraphElement>(null);
  const [{ count, amount }, setValues] = useState({ count: defaultCount, amount: defaultAmount });

  useEffect(() => {
    const form = line.current?.closest("form");
    if (!form) return;
    const read = () => {
      const value = (name: string) => Math.max(0, Number((form.elements.namedItem(name) as HTMLInputElement | null)?.value) || 0);
      setValues({ count: value("count"), amount: value("amount") });
    };
    form.addEventListener("input", read);
    return () => form.removeEventListener("input", read);
  }, []);

  return (
    <p ref={line} aria-live="polite" className="text-small text-muted">
      This issue: up to <span className="num">{count}</span> × <span className="num">{peso(amount)}</span> ={" "}
      <strong className="num text-text">{peso(count * amount)}</strong>
    </p>
  );
}
