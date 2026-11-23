import Link from "next/link";
import { ArrowLeft, Hash, House, LogOut, Mail, MapPin, ShieldCheck, UserRound } from "lucide-react";
import { homeFor, requireViewer } from "@/lib/auth";
import { AppHeader, currentTheme } from "@/components/app-header";
import { ValidatedForm } from "@/components/form";
import { SubmitButton } from "@/components/submit-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { CardSection, Field, PageHero } from "@/components/ui";
import { signOut } from "@/app/login/actions";
import { AvatarEditor } from "./avatar-editor";
import { updateName } from "./actions";

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
        <Link href={homeFor(viewer.role)} className="mb-3 inline-flex h-9 items-center gap-1.5 rounded-full pr-3 text-small font-semibold text-muted hover:text-text">
          <ArrowLeft size={12} aria-hidden />
          Back
        </Link>

        <PageHero visual={<AvatarEditor url={viewer.avatarUrl} initials={viewer.initials} />} title={name} sub={viewer.email} />

        <CardSection title="Personal info">
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
        </CardSection>

        <CardSection title="Display name" icon={UserRound}>
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
        </CardSection>

        <CardSection title="Appearance">
          <ThemeSwitcher initial={theme} />
        </CardSection>

        <section className="rounded-md bg-surface p-3.5 shadow-receipt">
          <ValidatedForm action={signOut} className="contents">
            <button
              type="submit"
              data-confirm-title="Sign out?"
              data-confirm-body="You'll need your email and password to sign in again."
              data-confirm-label="Sign out"
              data-confirm-tone="destructive"
              className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-full font-semibold text-error hover:bg-error-bg"
            >
              <LogOut size={14} strokeWidth={1.75} aria-hidden />
              Sign out
            </button>
          </ValidatedForm>
        </section>
      </main>
    </div>
  );
}
