import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ReceiptText, ScanLine, ShieldCheck, Trophy } from "lucide-react";
import { getViewer } from "@/lib/auth";
import { Notice } from "@/components/ui";
import { ReceiptPreview } from "@/components/landing/receipt-preview";
import { AuthForms } from "./auth-forms";

const COPY = {
  in: {
    title: "Welcome back",
    sub: "Sign in to see your receipt and where you rank this month.",
  },
  up: {
    title: "Create your account",
    sub: "All you need is your latest Meralco bill.",
  },
};

const STEPS = [
  {
    icon: ScanLine,
    title: "Snap your Meralco bill",
    body: "We read the kWh, amount and 12-month history for you.",
  },
  {
    icon: ReceiptText,
    title: "See each appliance in pesos",
    body: "Aircon, ref, electric fan, plus what's unaccounted for.",
  },
  {
    icon: Trophy,
    title: "Rank on % saved, not kWh used",
    body: "Small homes compete fairly. Top savers get sari-sari vouchers.",
  },
];

export const metadata = { title: "Sign in · Kuryentipid" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ mode?: string; error?: string }> }) {
  if (await getViewer()) redirect("/");
  const params = await searchParams;
  const mode = params.mode === "up" ? "up" : "in";
  return (
    <main className="mx-auto flex min-h-dvh max-w-[960px] flex-col px-4 pb-12">
      <header className="flex h-14 items-center">
        <Link href="/" aria-label="Kuryentipid home">
          <Image src="/logo-wordmark-light.png" alt="Kuryentipid" width={640} height={228} priority className="h-10 w-auto dark:hidden" />
          <Image src="/logo-wordmark-dark.png" alt="Kuryentipid" width={640} height={228} priority className="hidden h-10 w-auto dark:block" />
        </Link>
      </header>

      <div className="grid flex-1 items-center gap-8 pt-4 lg:grid-cols-2 lg:gap-12">
        <section className="mx-auto w-full max-w-[480px] lg:order-2">
          <h1 className="text-display font-semibold text-balance">{COPY[mode].title}</h1>
          <p className="mt-1 mb-5 text-muted">{COPY[mode].sub}</p>
          {params.error === "google" && (
            <div className="mb-3">
              <Notice tone="error">Google sign-in didn&apos;t finish. Try again, or use your email and password.</Notice>
            </div>
          )}
          <AuthForms mode={mode} />
          <p className="mt-6 flex gap-2 text-small text-muted">
            <ShieldCheck size={16} strokeWidth={1.75} aria-hidden className="mt-0.5 shrink-0" />
            Your bill photos stay private to you and your barangay admin. Neighbors only see your household number, % saved and badges.
          </p>
        </section>

        <aside aria-labelledby="how-it-works" className="mx-auto w-full max-w-[480px] lg:order-1">
          <div className="rounded-lg bg-lime p-5 text-on-lime">
            <h2 id="how-it-works" className="font-display text-h2 font-semibold text-balance">
              Your electric bill, itemized.
            </h2>
            <ol className="mt-4 flex flex-col gap-3">
              {STEPS.map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex gap-3">
                  <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-on-lime text-lime">
                    <Icon size={20} strokeWidth={1.75} />
                  </span>
                  <span className="text-small">
                    <strong className="block text-body font-semibold">{title}</strong>
                    {body}
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <ReceiptPreview className="mt-3" />
        </aside>
      </div>
    </main>
  );
}
