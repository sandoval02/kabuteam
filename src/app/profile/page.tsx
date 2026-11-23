import Link from "next/link";
import { ArrowLeft, Hash, House, Mail, MapPin, ShieldCheck, UserRound } from "lucide-react";
import { homeFor, requireViewer } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";
import { currentTheme } from "@/lib/theme";
import { ValidatedForm } from "@/components/form";
import { SubmitButton } from "@/components/submit-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Field } from "@/components/ui";
import { SignOutForm } from "@/components/sign-out-form";
import { AvatarEditor } from "./avatar-editor";
import { updateName } from "./actions";

export const metadata = { title: "Profile · TipidTayo" };

const ROLE_LABEL = { resident: "Resident", store: "Partner store", admin: "Barangay admin" } as const;

function Row({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <Icon size={14} strokeWidth={1.75} aria-hidden className="shrink-0 text-muted" />
      <div className="min-w-0">
        <p className="text-small text-muted">{label}</p>
        <p className="truncate font-semibold">{value}</p>
      </div>
    </li>
  );
}

export default async function ProfilePage() {
  const viewer = await requireViewer();
  const theme = await currentTheme();
  const name = viewer.displayName ?? viewer.householdLabel;

  return (
    <div className="mx-auto min-h-dvh max-w-[480px]">
      <AppHeader title="Profile" sub={viewer.barangayName} />
      <main className="px-4 pb-12 pt-1">
        <Link href={homeFor(viewer.role)} className="mb-3 inline-flex min-h-11 items-center gap-1.5 rounded-full pr-3 text-small font-semibold text-muted hover:text-text">
          <ArrowLeft size={12} aria-hidden />
          Back
        </Link>

        <section className="mb-5 flex flex-col items-center text-center">
          <AvatarEditor url={viewer.avatarUrl} initials={viewer.initials} />
          <h1 className="mt-3 text-display font-semibold">{name}</h1>
          <p className="text-muted">{viewer.email}</p>
        </section>

        <section aria-labelledby="info" className="mb-3 rounded-md bg-surface p-3.5 shadow-receipt">
          <h2 id="info" className="mb-1 font-semibold">
            Personal info
          </h2>
          <ul className="divide-y divide-border">
            <Row icon={Mail} label="Email" value={viewer.email} />
            <Row icon={ShieldCheck} label="Role" value={ROLE_LABEL[viewer.role]} />
            <Row icon={MapPin} label="Barangay" value={viewer.barangayName} />
            {viewer.role === "resident" && (
              <>
                <Row icon={House} label="Household" value={viewer.householdLabel} />
                <Row icon={Hash} label="Meralco account" value={viewer.accountNumber ?? "Set when you save your first bill"} />
              </>
            )}
          </ul>
        </section>

        <section aria-labelledby="name" className="mb-3 rounded-md bg-surface p-3.5 shadow-receipt">
          <h2 id="name" className="mb-2 flex items-center gap-2 font-semibold">
            <UserRound size={14} strokeWidth={1.75} aria-hidden />
            Display name
          </h2>
          <ValidatedForm action={updateName} schema="displayName" className="flex flex-col gap-3">
            <Field
              label="Name"
              name="display_name"
              defaultValue={viewer.displayName ?? ""}
              maxLength={60}
              autoComplete="name"
              placeholder="e.g. Juan Dela Cruz"
              hint="Shown in your menu. The ranking only ever shows your household number."
            />
            <SubmitButton variant="secondary" pendingText="Saving…">
              Save name
            </SubmitButton>
          </ValidatedForm>
        </section>

        <section aria-labelledby="appearance" className="mb-3 rounded-md bg-surface p-3.5 shadow-receipt">
          <h2 id="appearance" className="mb-2 font-semibold">
            Appearance
          </h2>
          <ThemeSwitcher initial={theme} />
        </section>

        <section className="rounded-md bg-surface p-3.5 shadow-receipt">
          <SignOutForm className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-full font-semibold text-error hover:bg-error-bg" />
        </section>
      </main>
    </div>
  );
}
