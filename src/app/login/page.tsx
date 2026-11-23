import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getViewer } from "@/lib/auth";
import { ROLES, type SignUpRole } from "@/lib/validation";
import { MONTH } from "@/components/landing/month";
import { AuthForms } from "./auth-forms";

const COPY = {
  in: { title: "Welcome back", sub: "Sign in to see your receipt and where you rank this month." },
  up: { title: "Create your account", sub: "Households, sari-sari stores and barangay admins all sign up here." },
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ mode?: string; role?: string }> }) {
  if (await getViewer()) redirect("/");
  const params = await searchParams;
  const mode = params.mode === "up" ? "up" : "in";
  const role: SignUpRole = (ROLES as readonly string[]).includes(params.role ?? "") ? (params.role as SignUpRole) : "resident";
  return (
    <main className="mx-auto flex min-h-dvh max-w-[960px] flex-col px-4 pb-12">
      <header className="flex h-16 items-center">
        <Link href="/" aria-label="Kuryentipid home">
          <Image src="/logo-wordmark-light.png" alt="Kuryentipid" width={640} height={228} priority className="h-10 w-auto dark:hidden" />
          <Image src="/logo-wordmark-dark.png" alt="Kuryentipid" width={640} height={228} priority className="hidden h-10 w-auto dark:block" />
        </Link>
      </header>

      <div className="grid flex-1 items-start gap-8 pt-4 lg:grid-cols-2 lg:gap-12 lg:pt-10">
        <section className="mx-auto w-full max-w-[480px] lg:order-2">
          <h1 className="text-display font-semibold">{COPY[mode].title}</h1>
          <p className="mb-5 mt-1 text-muted">{COPY[mode].sub}</p>
          <AuthForms mode={mode} role={role} />
          <p className="mt-6 flex gap-2 text-small text-muted">
            <ShieldCheck size={16} strokeWidth={1.75} aria-hidden className="mt-0.5 shrink-0" />
            Your bill photos stay private to you and your barangay admin. Neighbors only see your household number, % saved and badges.
          </p>
        </section>

        <aside aria-labelledby="cycle" className="mx-auto w-full max-w-[480px] rounded-lg bg-lime p-5 text-on-lime lg:sticky lg:top-6 lg:order-1">
          <h2 id="cycle" className="font-display text-h2 font-semibold">
            One billing month in your barangay
          </h2>
          <ol className="mt-4 border-t-2 border-on-lime">
            {MONTH.map((d) => (
              <li key={d.id} className="grid grid-cols-[5.5rem_1fr] gap-3 border-b border-on-lime/25 py-2.5 last:border-b-0">
                <span className="num text-small font-semibold">
                  {d.date}
                  {d.who && <span className="block font-sans font-normal">{d.who}</span>}
                </span>
                <span className="text-small">
                  <strong className="block text-body font-semibold">{d.title}</strong>
                  {d.line}
                </span>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </main>
  );
}
