import Link from "next/link";
import { Field } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { ValidatedForm } from "@/components/form";
import { signIn, signInWithGoogle, signUp } from "./actions";

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

export function AuthForms({ mode }: { mode: "in" | "up" }) {
  const up = mode === "up";
  return (
    <>
      <div className="rounded-md bg-surface p-3.5 shadow-receipt">
        <ValidatedForm action={signInWithGoogle} className="flex flex-col gap-3">
          <SubmitButton variant="secondary" pendingText="Opening Google…">
            <GoogleMark />
            Continue with Google
          </SubmitButton>
        </ValidatedForm>
        <p className="my-4 flex items-center gap-3 text-small text-muted before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
          or with email
        </p>
        {/* key: switching modes remounts the form so errors and typed values don't carry over */}
        <ValidatedForm key={mode} action={up ? signUp : signIn} schema={up ? "signUp" : "credentials"}>
          {up && (
            <Field
              label="Name"
              name="display_name"
              maxLength={60}
              autoComplete="name"
              placeholder="e.g. Juan Dela Cruz"
              hint="Optional. Only you see it; the ranking shows your household number."
            />
          )}
          <Field
            label="Email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            placeholder="juan@example.com"
            hint={up ? "You'll use this to sign in." : undefined}
          />
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete={up ? "new-password" : "current-password"}
            required
            minLength={8}
            hint={up ? "At least 8 characters." : undefined}
          />
          <SubmitButton pendingText={up ? "Creating account…" : "Signing in…"}>{up ? "Create account" : "Sign in"}</SubmitButton>
        </ValidatedForm>
      </div>

      <p className="mt-4 text-center text-muted">
        {up ? "Already have an account? " : "New here? "}
        <Link href={up ? "/login" : "/login?mode=up"} replace className="font-semibold text-text underline underline-offset-4">
          {up ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </>
  );
}
