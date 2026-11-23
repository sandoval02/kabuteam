import Link from "next/link";
import { buttonStyles } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center px-4 py-12">
      <p className="font-display text-[1.15rem] font-bold tracking-wide">TipidTayo</p>
      <h1 className="mt-6 text-display font-semibold">Page not found.</h1>
      <p className="mt-2 text-muted">That page doesn&apos;t exist. Go back to your dashboard.</p>
      <Link href="/" className={`${buttonStyles.primary} mt-6 self-start`}>
        Go home
      </Link>
    </main>
  );
}
