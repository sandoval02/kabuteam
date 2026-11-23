"use client";

import { useState, useTransition } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { saveTheme } from "@/app/theme-actions";
import type { ThemeChoice } from "@/lib/theme";

const OPTIONS: { value: ThemeChoice; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

/** Light / Dark / System. Applies instantly, then saves the choice in a cookie. */
export function ThemeSwitcher({ initial }: { initial: ThemeChoice }) {
  const [theme, setTheme] = useState<ThemeChoice>(initial);
  const [, startTransition] = useTransition();

  function choose(next: ThemeChoice) {
    setTheme(next);
    if (next === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", next);
    startTransition(() => saveTheme(next));
  }

  return (
    <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-1 rounded-full bg-surface-2 p-1">
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          onClick={() => choose(value)}
          className={`flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-full text-small font-semibold transition-colors duration-100 ${
            theme === value ? "bg-surface text-text shadow-receipt" : "text-muted hover:text-text"
          }`}
        >
          <Icon size={12} strokeWidth={2} aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
}
