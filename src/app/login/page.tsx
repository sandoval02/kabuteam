import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { AuthForms } from "./auth-forms";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  if (await getViewer()) redirect("/");
  const { mode } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center px-4 py-12">
      <Link href="/" className="num self-start text-small font-semibold tracking-wide text-primary">
        TIPIDTAYO
      </Link>
      <h1 className="mt-2 text-display font-semibold">Your electric bill, itemized.</h1>
      <p className="mt-2 text-muted">
        See what each appliance really costs you, and compete with your barangay on how much you save, not how little you use.
      </p>
      <AuthForms initialMode={mode === "up" ? "up" : "in"} />
    </main>
  );
}
