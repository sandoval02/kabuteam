import Image from "next/image";
import Link from "next/link";
import QRCode from "qrcode";
import { ArrowRight, Lightbulb, TriangleAlert } from "lucide-react";
import { buttonStyles, kwh, peso } from "@/components/ui";
import { SAVINGS_CAP, LOW_USAGE_FLOOR, LOW_USAGE_KWH } from "@/lib/scoring";
import { EXAMPLE_AIRCON, EXAMPLE_HOUSEHOLD, EXAMPLE_PERIOD, EXAMPLE_RECEIPT as R, EXAMPLE_TIP, VOUCHER_CODE } from "./example-data";
import { FairScoreDemo } from "./fair-score-demo";
import { MonthStrip } from "./month-strip";
import { MONTH, type DayId } from "./month";

const SIGN_UP = { resident: "/login?mode=up", store: "/login?mode=up&role=store", admin: "/login?mode=up&role=admin" };
const link = "font-semibold underline underline-offset-4 hover:text-muted";

/** A day of the month: its date in a calendar gutter (the sticky strip carries it on phones), then the content. */
function Day({ id, title, children }: { id: DayId; title: string; children: React.ReactNode }) {
  const day = MONTH.find((d) => d.id === id)!;
  return (
    <section id={id} data-day={id} aria-labelledby={`${id}-title`} className="scroll-mt-20 border-t border-border">
      <div className="mx-auto grid max-w-landing gap-x-10 px-4 py-16 md:grid-cols-[10.5rem_1fr] md:px-6 md:py-24">
        <p aria-hidden className="hidden md:block">
          <span className="num block whitespace-nowrap text-section font-semibold uppercase">{day.date}</span>
          <span className="text-muted">{day.who}</span>
        </p>
        <div>
          <h2 id={`${id}-title`} className="max-w-[20ch] text-section font-semibold">
            {title}
          </h2>
          {children}
        </div>
      </div>
    </section>
  );
}

const pct0 = (share: number) => `${Math.round(share * 100)}%`;
// Emphasis: the costliest appliance (the one to fix) in the chart accent, the rest neutral, the gap in amber.
const TONE = {
  top: "bg-primary-bright",
  rest: "bg-border-strong",
  gap: "bg-warning",
};
type Part = { id: string; label: string; kwh: number; pesos: number; share: number; tone: keyof typeof TONE };
const PARTS: Part[] = [
  ...R.lines.map((l, i): Part => ({ id: l.id, label: l.label, kwh: l.kwh, pesos: l.pesos, share: l.share, tone: i === 0 ? "top" : "rest" })),
  ...(R.unaccounted ? [{ id: "unaccounted", label: "Unaccounted", ...R.unaccounted, tone: "gap" } satisfies Part] : []),
];

/** The thesis as a figure: the bill's one number, then the same total split into what each part costs. */
function BillSplit() {
  return (
    <figure className="mt-12 border-t-2 border-text pt-5 md:mt-16">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-1">
        <p>
          <span className="block text-small text-muted">
            Example bill · {EXAMPLE_HOUSEHOLD}, {EXAMPLE_PERIOD} · amount due
          </span>
          {/* JetBrains Mono has no ₱; at this size the fallback glyph overpowers the digits, so it is set smaller. */}
          <span className="num mt-2 flex items-start text-figure font-semibold">
            <span className="sr-only">{peso(R.totalPesos)}</span>
            <span aria-hidden className="mr-1 mt-2 font-sans text-display text-muted">
              ₱
            </span>
            <span aria-hidden>{R.totalPesos.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
          </span>
        </p>
        <p className="num pb-2 text-small text-muted">
          {kwh(R.totalKwh)} · {peso(R.rate)}/kWh
        </p>
      </div>
      <div
        role="img"
        aria-label={`Example split of the bill: ${PARTS.map((p) => `${p.label} ${peso(p.pesos)}, ${pct0(p.share)}`).join("; ")}`}
        className="mt-4 flex h-7 gap-0.5"
      >
        {PARTS.map((p) => (
          <span
            key={p.id}
            title={`${p.label}: ${peso(p.pesos)} · ${kwh(p.kwh)} · ${pct0(p.share)}`}
            style={{ flex: `${p.share} 1 0` }}
            className={`min-w-0 rounded-sm ${TONE[p.tone]}`}
          />
        ))}
      </div>
      <ul className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 md:grid-cols-5">
        {PARTS.map((p) => (
          <li key={p.id} className="flex gap-2.5">
            <span aria-hidden className={`mt-1.5 size-2.5 shrink-0 rounded-full ${TONE[p.tone]}`} />
            <span className="min-w-0">
              <span className={`flex items-center gap-1.5 text-small font-semibold ${p.tone === "gap" ? "text-warning" : ""}`}>
                {p.tone === "gap" && <TriangleAlert size={14} strokeWidth={1.75} aria-hidden />}
                {p.label}
              </span>
              <span className="num block whitespace-nowrap font-semibold">{peso(p.pesos)}</span>
              <span className="num block text-small text-muted">
                {kwh(p.kwh)} · {pct0(p.share)}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <figcaption className="mt-5 max-w-[70ch] text-small text-muted">
        Example household: the parts add up to the bill. Unaccounted is power your appliances can&apos;t explain: a worn ref door seal, standby
        devices, or a leak.
      </figcaption>
    </figure>
  );
}

const RULES = [
  { term: "Same month last year", body: "April is compared with last April, so the hot months don't sink anyone." },
  { term: `Capped at ${SAVINGS_CAP}%`, body: "A house left empty on vacation can't run away with the ranking." },
  { term: `${LOW_USAGE_FLOOR}% floor at ${LOW_USAGE_KWH} kWh or less`, body: "Homes already using very little aren't punished for having nothing left to cut." },
  { term: "Checked by the barangay", body: "Odd ₱/kWh rates, big edits, or an account number another house uses go to the admin before they count." },
];

const PILOT = [
  "The council passes a resolution and names an admin, such as the barangay secretary.",
  "Agree the voucher value, the number of winners, and how stores get paid back.",
  "The admin signs up with the access code and approves each partner store.",
  "At an assembly or house to house, help residents scan their latest bill.",
  "Every month: review flagged bills, issue vouchers to the top savers, pay the stores.",
  "After three rounds, report the kWh and pesos saved against last year.",
];

export async function Landing() {
  const qr = await QRCode.toDataURL(VOUCHER_CODE, { margin: 1, width: 176, color: { dark: "#121412", light: "#ffffff" } });

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex h-18 max-w-landing items-center justify-between gap-4 px-4 md:px-6">
        <Link href="/" aria-label="Kuryentipid home">
          <Image src="/logo-wordmark-light.png" alt="Kuryentipid" width={640} height={228} priority className="h-11 w-auto dark:hidden" />
          <Image src="/logo-wordmark-dark.png" alt="Kuryentipid" width={640} height={228} priority className="hidden h-11 w-auto dark:block" />
        </Link>
        <nav aria-label="Account" className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Link href="/login" className={`${buttonStyles.ghost} px-3`}>
            Sign in
          </Link>
          <Link href={SIGN_UP.resident} className={buttonStyles.primary}>
            <span className="sm:hidden">Join</span>
            <span className="hidden sm:inline">Create account</span>
          </Link>
        </nav>
      </header>

      <MonthStrip />

      <main>
        <section id="scan" data-day="scan" aria-labelledby="hero-title" className="scroll-mt-20">
          <div className="mx-auto max-w-landing px-4 pb-16 pt-10 md:px-6 md:pb-24 md:pt-14">
            <div className="grid items-end gap-x-12 gap-y-6 md:grid-cols-[1.2fr_1fr]">
              <h1 id="hero-title" className="max-w-[13ch] text-hero font-semibold">
                Your bill is one number. Make it a receipt.
              </h1>
              <div>
                <p className="max-w-[44ch] text-lead text-muted">
                  Photograph your Meralco bill and the stickers on your appliances. Kuryentipid splits the total into what each one costs you.
                </p>
                <Link href={SIGN_UP.resident} className={`${buttonStyles.primary} mt-6 h-12 px-6`}>
                  Scan your first bill
                  <ArrowRight size={18} strokeWidth={2.25} aria-hidden />
                </Link>
                <p className="mt-5 max-w-[46ch] text-small text-muted">
                  Run a sari-sari store?{" "}
                  <Link href={SIGN_UP.store} className={`${link} text-text`}>
                    Sign up as a partner store
                  </Link>
                  . Barangay official?{" "}
                  <Link href={SIGN_UP.admin} className={`${link} text-text`}>
                    Set up your barangay
                  </Link>
                  .
                </p>
              </div>
            </div>
            <BillSplit />
          </div>
        </section>

        <Day id="appliances" title="Snap the sticker on each appliance.">
          <div className="mt-6 grid items-start gap-10 lg:grid-cols-2">
            <p className="max-w-[52ch] text-lead text-muted">
              The rating sticker gives the watts. You set the hours you use it. Every line is scaled so the receipt matches the kWh on your bill,
              and the most expensive line gets one concrete fix.
            </p>
            <figure className="flex flex-col gap-3">
              <div className="num rounded-md border-2 border-border-strong bg-surface-2 p-4 text-small uppercase leading-relaxed">
                <p className="font-semibold">Room air conditioner</p>
                <p className="flex justify-between gap-4 border-t border-border-strong pt-1">
                  <span>Rated voltage</span>
                  <span>230 V ~ 60 Hz</span>
                </p>
                <p className="flex justify-between gap-4">
                  <span>Rated input</span>
                  <span className="font-semibold">{EXAMPLE_AIRCON.watts.toLocaleString("en-PH")} W</span>
                </p>
                <p className="flex justify-between gap-4">
                  <span>Compressor</span>
                  <span>Fixed speed</span>
                </p>
              </div>
              <p className="text-small text-muted">
                Read as: <strong className="text-text">Aircon · {EXAMPLE_AIRCON.watts.toLocaleString("en-PH")} W · non-inverter</strong>, used{" "}
                {EXAMPLE_AIRCON.hoursPerDay} hours a day.
              </p>
              <div className="flex gap-3 rounded-md bg-surface p-4 shadow-receipt">
                <Lightbulb size={20} strokeWidth={1.75} aria-hidden className="mt-0.5 shrink-0" />
                <p>
                  <strong className="block">Change this first</strong>
                  {EXAMPLE_TIP.text}.{" "}
                  <span className="num font-semibold">{peso(EXAMPLE_TIP.monthlySaving)}</span> less a month
                  {EXAMPLE_TIP.paybackMonths && <>, paying for itself in about {EXAMPLE_TIP.paybackMonths} months</>}.
                </p>
              </div>
              <figcaption className="text-small text-muted">Example sticker and tip for the aircon on the receipt above.</figcaption>
            </figure>
          </div>
        </Day>

        <Day id="ranking" title="A small house can beat a mansion.">
          <p className="mb-8 mt-4 max-w-[60ch] text-lead text-muted">
            Everyone is measured against their own bill from the same month last year, read off the chart printed on it. Move the sliders: this
            is the formula the ranking uses.
          </p>
          <FairScoreDemo />
          <dl className="mt-10 grid gap-x-10 gap-y-5 border-t border-border pt-6 md:grid-cols-2">
            {RULES.map((r) => (
              <div key={r.term}>
                <dt className="font-semibold">{r.term}</dt>
                <dd className="text-muted">{r.body}</dd>
              </div>
            ))}
          </dl>
        </Day>

        <Day id="voucher" title="Tipid ka, may premyo.">
          <div className="mt-6 grid items-start gap-10 md:grid-cols-[1fr_auto]">
            <div className="max-w-[52ch]">
              <p className="text-lead text-muted">
                Each month the barangay gives its top savers a voucher for a partner sari-sari store. The store types the code or scans the QR, and a
                used code can&apos;t be redeemed again. The barangay pays the store back, so the money stays on your street.
              </p>
              <p className="mt-4 text-muted">Badges too: First Scan, 10% Club, Efficient Already and Top 3.</p>
              <Link href={SIGN_UP.store} className={`${buttonStyles.secondary} mt-8`}>
                Sign up as a partner store
              </Link>
            </div>
            <figure className="mx-auto w-full max-w-72">
              <div className="rounded-md bg-surface shadow-receipt">
                <div className="flex flex-col items-center p-5">
                  {/* eslint-disable-next-line @next/next/no-img-element -- generated data URL */}
                  <img src={qr} alt={`Example QR code for voucher ${VOUCHER_CODE}`} width={176} height={176} />
                  <p className="num mt-3 text-h2 font-semibold tracking-[0.3em]">{VOUCHER_CODE}</p>
                </div>
                <p className="border-t border-dashed border-border-strong px-5 py-3 text-center">
                  <strong className="num">{peso(100)}</strong> off at the <span className="whitespace-nowrap">sari-sari store</span>
                </p>
              </div>
              <figcaption className="mt-3 text-center text-small text-muted">Example voucher · Top saver, October</figcaption>
            </figure>
          </div>
        </Day>

        <Day id="report" title="Run a three-month pilot in your barangay.">
          <p className="mt-4 max-w-[60ch] text-lead text-muted">
            One barangay, about 50 households and two or three partner stores. Each Meralco billing cycle is one ranking round. The admin never sets
            scores; the app computes them.
          </p>
          <div className="mt-10 grid items-start gap-10 lg:grid-cols-[1.2fr_1fr]">
            <ol className="flex flex-col gap-4">
              {PILOT.map((step, i) => (
                <li key={step} className="grid grid-cols-[2.5rem_1fr] items-baseline">
                  <span className="num font-semibold text-muted">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <figure>
              <div className="rounded-md bg-surface p-5 shadow-receipt">
                <p className="border-b border-dashed border-border-strong pb-3 font-semibold">One year, one barangay</p>
                <ul className="divide-y divide-dashed divide-border">
                  <li className="flex items-baseline justify-between gap-4 py-2.5">
                    <span>
                      Vouchers
                      <span className="num block text-small text-muted">10 winners × ₱100 × 12 months</span>
                    </span>
                    <span className="num whitespace-nowrap font-semibold">{peso(12000)}</span>
                  </li>
                  <li className="flex items-baseline justify-between gap-4 py-2.5">
                    <span>
                      Onboarding drive
                      <span className="block text-small text-muted">Printed guides, snacks at the assembly</span>
                    </span>
                    <span className="num whitespace-nowrap font-semibold">≈ {peso(2000)}</span>
                  </li>
                  <li className="flex items-baseline justify-between gap-4 py-2.5">
                    <span>
                      Hardware
                      <span className="block text-small text-muted">A phone and the paper bill</span>
                    </span>
                    <span className="num font-semibold">{peso(0)}</span>
                  </li>
                </ul>
              </div>
              <figcaption className="mt-3 text-small text-muted">Example budget. The council decides the voucher value and the number of winners.</figcaption>
            </figure>
          </div>
          <Link href={SIGN_UP.admin} className={`${buttonStyles.primary} mt-10`}>
            Set up as barangay admin
          </Link>
          <p className="mt-2 text-small text-muted">You&apos;ll need the admin access code from whoever runs Kuryentipid for your barangay.</p>
        </Day>

        <section aria-labelledby="start" className="border-t-2 border-text">
          <div className="mx-auto flex max-w-landing flex-col gap-6 px-4 py-16 md:flex-row md:items-end md:justify-between md:px-6">
            <h2 id="start" className="max-w-[18ch] text-section font-semibold">
              Start with the bill on your table.
            </h2>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href={SIGN_UP.resident} className={buttonStyles.primary}>
                Create household account
              </Link>
              <Link href={SIGN_UP.store} className={buttonStyles.secondary}>
                Partner store
              </Link>
              <Link href={SIGN_UP.admin} className={buttonStyles.secondary}>
                Barangay admin
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-4 py-6 text-center text-small text-muted">
        Kuryentipid · SDG 7, affordable and clean energy · Bill photos stay private to you and your barangay admin.
      </footer>
    </div>
  );
}
