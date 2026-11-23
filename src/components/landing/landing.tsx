import Link from "next/link";
import { Award, Ticket, ShieldCheck, Zap } from "lucide-react";
import { CtaLabel, IconTile, buttonStyles } from "@/components/ui";
import { HeroScene } from "./hero-scene";
import { PrintingReceipt } from "./printing-receipt";
import { FairScoreDemo } from "./fair-score-demo";

const BADGES = [
  { name: "First Scan", body: "Scanned a first bill" },
  { name: "10% Club", body: "Saved 10% or more vs last year" },
  { name: "Efficient Already", body: "Used 100 kWh or less" },
  { name: "Top 3", body: "Among the barangay's top savers" },
];

export function Landing() {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-3 z-50 mx-auto mt-3 flex h-15 w-[min(1120px,calc(100%-1.5rem))] items-center justify-between gap-4 rounded-full bg-surface/85 pl-5 pr-2 shadow-sheet backdrop-blur-xl backdrop-saturate-150">
        <p className="font-display text-[1.15rem] font-bold tracking-wide">
          Tipid<span className="ml-0.5 rounded-md bg-lime px-1.5 py-0.5 text-on-lime">Tayo</span>
        </p>
        <nav aria-label="Account" className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Link href="/login" className={`${buttonStyles.ghost} h-10 px-3`}>
            Sign in
          </Link>
          <Link href="/login?mode=up" className={`${buttonStyles.primary} h-10 px-4`}>
            <span className="sm:hidden">Join</span>
            <span className="hidden sm:inline">Create account</span>
          </Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-[1120px] items-center gap-8 px-4 pb-16 pt-8 md:grid-cols-[1fr_1.15fr] md:px-6 md:pt-16">
          <div>
            <h1 className="text-[2.5rem] font-semibold leading-[1.1] tracking-tight md:text-[3.5rem]">
              Your electric bill, itemized.
            </h1>
            <p className="mt-4 max-w-[46ch] text-[1.125rem] leading-7 text-muted">
              Photograph your Meralco bill and appliance stickers. See what each appliance costs you every month, then compete with your
              barangay on <strong className="text-text">% saved</strong>, not raw kWh, for sari-sari store vouchers.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href="/login?mode=up" className={`${buttonStyles.primary} min-w-52`}>
                <CtaLabel>Scan your first bill</CtaLabel>
              </Link>
              <a href="#fair" className={buttonStyles.secondary}>
                How the ranking stays fair
              </a>
            </div>
          </div>
          <HeroScene />
        </section>

        <section aria-labelledby="how" className="border-y border-border bg-surface">
          <div className="mx-auto max-w-[1120px] px-4 py-16 md:px-6 md:py-24">
            <h2 id="how" className="mb-10 text-[1.75rem] font-semibold tracking-tight md:text-[2.25rem]">
              One number becomes a receipt.
            </h2>
            <PrintingReceipt />
          </div>
        </section>

        <section id="fair" aria-labelledby="fair-title" className="mx-auto max-w-[1120px] scroll-mt-8 px-4 py-16 md:px-6 md:py-24">
          <h2 id="fair-title" className="text-[1.75rem] font-semibold tracking-tight md:text-[2.25rem]">
            A small house can beat a mansion.
          </h2>
          <p className="mb-6 mt-3 max-w-[60ch] text-muted">
            Everyone competes against their own usage in the same month last year, read from the chart on their own bill. Move the sliders:
            this is the exact formula the ranking uses.
          </p>
          <FairScoreDemo />
          <ul className="mt-10 grid gap-4 md:grid-cols-3">
            <li className="flex gap-3 rounded-md bg-surface p-4 shadow-receipt">
              <IconTile icon={ShieldCheck} />
              <p>
                <strong className="block">Checked, not trusted.</strong> <span className="text-muted">One account number per household. Bills with odd rates or big edits go to the barangay for review.</span>
              </p>
            </li>
            <li className="flex gap-3 rounded-md bg-surface p-4 shadow-receipt">
              <IconTile icon={Zap} />
              <p>
                <strong className="block">Fair to low users.</strong> <span className="text-muted">Using 100 kWh or less scores at least 15%, so homes with nothing left to cut aren&apos;t punished.</span>
              </p>
            </li>
            <li className="flex gap-3 rounded-md bg-surface p-4 shadow-receipt">
              <IconTile icon={Award} />
              <p>
                <strong className="block">No summer penalty.</strong> <span className="text-muted">April is compared with last April, so hot months don&apos;t sink your score.</span>
              </p>
            </li>
          </ul>
        </section>

        <section aria-labelledby="rewards" className="border-t border-border bg-surface">
          <div className="mx-auto grid max-w-[1120px] gap-10 px-4 py-16 md:grid-cols-2 md:px-6 md:py-24">
            <div>
              <h2 id="rewards" className="text-[1.75rem] font-semibold tracking-tight md:text-[2.25rem]">
                Tipid ka, may premyo.
              </h2>
              <p className="mt-3 text-muted">
                Each month the barangay rewards its top savers with vouchers at partner sari-sari stores. The store scans the QR code once; a used
                code can&apos;t be redeemed again.
              </p>
              <ul className="mt-6 grid grid-cols-2 gap-3">
                {BADGES.map((b) => (
                  <li key={b.name} className="flex items-start gap-3 rounded-md bg-surface p-3 shadow-receipt">
                    <IconTile icon={Award} tone="gold" />
                    <span>
                      <span className="block font-semibold">{b.name}</span>
                      <span className="block text-small text-muted">{b.body}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-center justify-center">
              <div className="w-full max-w-xs rounded-lg bg-surface p-5 text-center shadow-receipt">
                <p className="flex items-center justify-center gap-2 font-semibold">
                  <Ticket size={15} strokeWidth={1.75} aria-hidden />
                  ₱50 off at the sari-sari store
                </p>
                <p className="text-small text-muted">Example voucher · Top saver, October</p>
                <p className="num mt-6 text-h2 font-semibold tracking-[0.3em]">K7QM4P</p>
                <p className="mt-1 text-small text-muted">Shown with a QR code in the app</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1120px] px-4 py-16 text-center md:px-6 md:py-24">
          <h2 className="mx-auto max-w-[24ch] text-[1.75rem] font-semibold tracking-tight md:text-[2.25rem]">
            The cheapest kilowatt-hour is the one you don&apos;t use.
          </h2>
          <p className="mt-4 inline-flex rounded-full bg-primary-soft px-3 py-1 text-small font-semibold text-primary">
            SDG 7 · Affordable and clean energy
          </p>
          <div>
            <Link href="/login?mode=up" className={`${buttonStyles.primary} mt-8 min-w-72`}>
              <CtaLabel>Create your household account</CtaLabel>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-4 py-6 text-center text-small text-muted">
        TipidTayo · Built for a hackathon on SDG 7. Bill photos stay private to you and your barangay admin.
      </footer>
    </div>
  );
}
