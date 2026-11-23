import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getViewer } from "@/lib/auth";
import { Notice, PageHero } from "@/components/ui";
import { HouseIllustration } from "@/components/house-illustration";
import { AuthForms } from "./auth-forms";

const COPY = {
  in: { title: "Welcome back", sub: "Sign in to see your receipt and where you rank this month." },
  up: { title: "Create your account", sub: "See what each appliance costs you, and save with your barangay." },
};

export const metadata = { title: "Sign in · Kuryentipid" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ mode?: string; error?: string }> }) {
  if (await getViewer()) redirect("/");
  const params = await searchParams;
  const mode = params.mode === "up" ? "up" : "in";
  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col px-4 pb-12">
      <header className="flex h-14 items-center">
        <Link href="/" className="flex items-center gap-2 font-display text-[1.15rem] font-bold tracking-wide">
          <Image src="/logo.png" alt="" width={28} height={28} priority />
          Kuryen<span className="ml-0.5 rounded-md bg-lime px-1.5 py-0.5 text-on-lime">tipid</span>
        </Link>
      </header>

      <div className="flex flex-1 flex-col justify-center">
        <PageHero
          visual={
            <div className="w-full rounded-lg bg-lime pt-4">
              <HouseIllustration className="mx-auto w-full max-w-60" />
            </div>
          }
          title={COPY[mode].title}
          sub={COPY[mode].sub}
        />
        {params.error === "google" && (
          <div className="mb-3">
            <Notice tone="error">Google sign-in didn&apos;t finish. Try again, or use your email and password.</Notice>
          </div>
        )}
        <AuthForms mode={mode} />
        <p className="mt-6 text-balance text-center text-small text-muted">
          <ShieldCheck size={14} strokeWidth={1.75} aria-hidden className="mr-1 inline align-[-2px]" />
          Your bill photos stay private. Neighbors only see your household number, % saved and badges.
        </p>
      </div>
    </main>
  );
}
