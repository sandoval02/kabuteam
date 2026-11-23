import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { AuthForms } from "./auth-forms";
import { HouseIllustration } from "@/components/house-illustration";

export const metadata = { title: "Sign in · TipidTayo" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  if (await getViewer()) redirect("/");
  const { mode } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col px-4 pb-12">
      <header className="flex h-14 items-center">
        <Link href="/" className="font-display text-[1.15rem] font-bold tracking-wide">
          Tipid<span className="ml-0.5 rounded-md bg-lime px-1.5 py-0.5 text-on-lime">Tayo</span>
        </Link>
      </header>
      <div className="flex flex-1 flex-col justify-center">
      <div className="mb-6 rounded-lg bg-lime pt-4">
        <HouseIllustration className="mx-auto w-full max-w-xs" />
      </div>
      <h1 className="text-display font-semibold tracking-tight">Your electric bill, itemized.</h1>
      <p className="mt-2 text-muted">
        See what each appliance really costs you, and compete with your barangay on how much you save, not how little you use.
      </p>
      <AuthForms initialMode={mode === "up" ? "up" : "in"} />
      </div>
    </main>
  );
}
