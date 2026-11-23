"use client";

import Script from "next/script";
import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { buttonStyles } from "@/components/ui";

type TokenResponse = { access_token?: string; error?: string };
type TokenClient = { requestAccessToken: () => void };
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (options: {
            client_id: string;
            scope: string;
            callback: (response: TokenResponse) => void;
            error_callback?: (error: { type: string }) => void;
          }) => TokenClient;
        };
      };
    };
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

/** Google's official "G" mark; its colors are required by Google's sign-in branding rules. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

/**
 * "Continue with Google" in the app's own secondary button style. Google's popup returns a short-lived
 * access token; it goes into the surrounding form's hidden field and the form submits, so sign-up keeps
 * its role and consent checks. The server checks the token with Google, including that it was issued
 * to this app's client ID.
 */
export function GoogleButton({ label }: { label: string }) {
  const input = useRef<HTMLInputElement>(null);
  const client = useRef<TokenClient | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [problem, setProblem] = useState<string | null>(null);
  const { pending } = useFormStatus();
  if (!CLIENT_ID) return null;

  function init() {
    if (!window.google?.accounts?.oauth2 || !CLIENT_ID) return setStatus("failed");
    client.current = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: "openid email profile",
      callback: ({ access_token }) => {
        const field = input.current;
        if (!access_token || !field?.form) return setProblem("Google sign-in didn't finish. Try again, or use your email and password.");
        field.value = access_token;
        field.form.requestSubmit();
        field.value = ""; // the submit already copied it; a later email submit must not reuse it
      },
      // Closing the popup is a choice, not an error.
      error_callback: ({ type }) => setProblem(type === "popup_closed" ? null : "Google sign-in couldn't open. Allow pop-ups for this site, or use your email and password."),
    });
    setStatus("ready");
  }

  return (
    <div className="flex flex-col gap-4">
      <input ref={input} type="hidden" name="google_credential" defaultValue="" />
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onReady={init} onError={() => setStatus("failed")} />
      <button
        type="button"
        className={`${buttonStyles.secondary} w-full`}
        disabled={status !== "ready" || pending}
        onClick={() => {
          setProblem(null);
          client.current?.requestAccessToken();
        }}
      >
        <GoogleMark />
        {label}
      </button>
      {(problem || status === "failed") && (
        <p role="alert" className="text-small text-error">
          {problem ?? "Google sign-in couldn't load. Use your email and password below."}
        </p>
      )}
      <p className="flex items-center gap-3 text-small text-muted before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
        or with email
      </p>
    </div>
  );
}
