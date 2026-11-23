"use client";

import Script from "next/script";
import { useRef, useState } from "react";

type Gsi = {
  accounts: {
    id: {
      initialize: (options: { client_id: string; callback: (r: { credential: string }) => void }) => void;
      renderButton: (el: HTMLElement, options: Record<string, string | number>) => void;
    };
  };
};
declare global {
  interface Window {
    google?: Gsi;
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

/**
 * Google's own button (Google Identity Services), so its branding rules are met by Google itself.
 * Google hands back a signed ID token; it goes into the surrounding form's hidden field and the form
 * submits, so sign-up keeps its role and consent checks. The server verifies the token.
 */
export function GoogleButton({ text }: { text: "continue_with" | "signup_with" }) {
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [failed, setFailed] = useState(false);
  if (!CLIENT_ID) return null;

  function render() {
    const el = box.current;
    if (!window.google || !el || !CLIENT_ID) return;
    const root = document.documentElement;
    const dark = root.dataset.theme === "dark" || (!root.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
    window.google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: ({ credential }) => {
        const field = input.current;
        if (!field?.form) return;
        field.value = credential;
        field.form.requestSubmit();
        field.value = ""; // the submit already copied it; a later email submit must not reuse it
      },
    });
    window.google.accounts.id.renderButton(el, {
      type: "standard",
      theme: dark ? "filled_black" : "outline",
      size: "large",
      shape: "pill",
      text,
      logo_alignment: "center",
      width: Math.max(200, Math.min(400, el.offsetWidth)),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <input ref={input} type="hidden" name="google_credential" defaultValue="" />
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onReady={render} onError={() => setFailed(true)} />
      {failed ? (
        <p className="text-small text-muted">Google sign-in couldn&apos;t load. Use your email and password below.</p>
      ) : (
        <div ref={box} className="flex h-10 justify-center" />
      )}
      <p className="flex items-center gap-3 text-small text-muted before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
        or with email
      </p>
    </div>
  );
}
