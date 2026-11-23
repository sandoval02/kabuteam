import Link from "next/link";
import { CheckField, Field } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { ValidatedForm } from "@/components/form";
import type { SignUpRole } from "@/lib/validation";
import { signIn, signUp } from "./actions";
import { GoogleButton } from "./google-button";
import { RoleFields } from "./role-fields";

export function AuthForms({ mode, role }: { mode: "in" | "up"; role: SignUpRole }) {
  const up = mode === "up";
  return (
    <>
      <div className="rounded-md bg-surface p-3.5 shadow-receipt">
        {/* key: switching modes remounts the form so errors and typed values don't carry over */}
        <ValidatedForm key={mode} action={up ? signUp : signIn} schema={up ? "signUp" : "signIn"}>
          {up && <RoleFields initial={role} />}
          {up && (
            <CheckField
              name="consent"
              label={
                <>
                  I agree that Kuryentipid keeps my bill photos, kWh and Meralco account number to work out my score. Neighbors only see my
                  household number, % saved and badges. <span className="text-muted">(Data Privacy Act, RA 10173)</span>
                </>
              }
            />
          )}
          <GoogleButton label={up ? "Sign up with Google" : "Continue with Google"} />
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
          <Field label="Email" name="email" type="email" inputMode="email" autoComplete="email" placeholder="juan@example.com" />
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete={up ? "new-password" : "current-password"}
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
