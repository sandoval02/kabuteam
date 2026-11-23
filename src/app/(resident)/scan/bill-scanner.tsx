"use client";

import { useState } from "react";
import { ScanLine } from "lucide-react";
import { PhotoCapture, postPhoto } from "@/components/photo-capture";
import { Field, Notice, peso } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { RATE_MAX, RATE_MIN, baselineFromHistory, effectiveRate, type HistoryEntry } from "@/lib/scoring";
import type { BillExtraction } from "@/lib/extraction/schemas";
import { ValidatedForm } from "@/components/form";
import { saveBill } from "../actions";

type ExtractResponse = { extraction: BillExtraction | null; servedBy: string; photoPath: string | null };
type Scan = { preview: string; reading: boolean; res: ExtractResponse | null; note?: string };

/** The bill form is always shown. A photo is optional: it fills the fields in, and the person checks them. */
export function BillScanner() {
  const [scan, setScan] = useState<Scan | null>(null);
  const [retake, setRetake] = useState(false);
  // Bumped after each read so the form remounts with the scanned values as defaults.
  const [formKey, setFormKey] = useState(0);
  // Typed values for the live ₱/kWh line; undefined = untouched, so the scanned value is used.
  const [typed, setTyped] = useState<{ kwh?: string; amount?: string }>({});

  async function onPhoto(file: File) {
    setRetake(false);
    const preview = URL.createObjectURL(file);
    setScan({ preview, reading: true, res: null });
    const { data, error } = await postPhoto<ExtractResponse>("/api/extract/bill", file);
    if (error || !data) {
      setScan({ preview, reading: false, res: null, note: error });
    } else if (!data.extraction) {
      setScan({ preview, reading: false, res: data, note: "Could not read this automatically. Type the numbers from your bill." });
    } else if (!data.extraction.readable) {
      // A bad photo won't improve with another model: ask for a retake (saves AI quota).
      setScan(null);
      setRetake(true);
    } else {
      setScan({ preview, reading: false, res: data });
    }
    setTyped({});
    setFormKey((k) => k + 1);
  }

  const reading = scan?.reading ?? false;
  const ex = scan?.res?.extraction ?? null;
  const history: HistoryEntry[] = ex?.history ?? [];
  const month = ex?.period_end?.slice(0, 7);
  const baseline = month ? baselineFromHistory(history, month) : null;
  const extracted = ex ? { kwh: ex.kwh, amountDue: ex.amount_due, baseline } : null;

  return (
    <div className="flex flex-col gap-3">
      {scan ? (
        <div className="relative overflow-hidden rounded-sm bg-surface-2" aria-live="polite">
          {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
          <img src={scan.preview} alt="Your bill photo" className={`max-h-48 w-full object-contain ${reading ? "opacity-50" : ""}`} />
          {reading && (
            <p className="absolute inset-0 flex items-center justify-center gap-2 font-semibold">
              <ScanLine size={16} aria-hidden className="animate-pulse" />
              Reading your bill…
            </p>
          )}
        </div>
      ) : (
        <p className="text-small text-muted">Take or upload a photo and we fill in the numbers. Lay the bill flat in good light with the whole page in view.</p>
      )}
      {retake && <Notice tone="warning">That photo could not be read as a bill. Retake it flat, in good light, with the whole page in view.</Notice>}
      {scan?.note && <Notice tone="warning">{scan.note}</Notice>}
      {ex && <Notice tone="info">Check each number against your bill. Fix anything that is wrong before saving.</Notice>}
      <PhotoCapture label={scan ? "Use a different photo" : "Take or upload bill photo"} onPhoto={onPhoto} disabled={reading} variant="lime" />

      <p className="my-1 flex items-center gap-3 text-small text-muted before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
        {ex ? "check the numbers" : "or type the numbers"}
      </p>

      <ValidatedForm key={formKey} action={saveBill} schema="bill">
        <fieldset disabled={reading} className="contents">
          <Field
            label="Account number"
            name="account_number"
            inputMode="numeric"
            autoComplete="off"
            required
            maxLength={15}
            placeholder="10 digits on your bill"
            defaultValue={ex?.account_number ?? ""}
          />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Period start" name="period_start" type="date" required defaultValue={ex?.period_start ?? ""} />
            <Field label="Period end" name="period_end" type="date" required defaultValue={ex?.period_end ?? ""} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="kWh used"
              name="kwh"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              required
              defaultValue={ex?.kwh ?? ""}
              onChange={(e) => setTyped((t) => ({ ...t, kwh: e.target.value }))}
            />
            <Field
              label="Amount due (₱)"
              name="amount_due"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              required
              defaultValue={ex?.amount_due ?? ""}
              onChange={(e) => setTyped((t) => ({ ...t, amount: e.target.value }))}
            />
          </div>
          <RateLine kwh={Number(typed.kwh ?? ex?.kwh ?? 0)} amount={Number(typed.amount ?? ex?.amount_due ?? 0)} />
          <Field
            label="Same month last year (kWh)"
            name="baseline_kwh"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            defaultValue={baseline ?? ""}
            hint={
              history.length
                ? `From the ${history.length}-month chart on your bill. Your savings are measured against this.`
                : "Find it on the usage chart of your bill. Leave empty if it is not shown."
            }
          />

          <input type="hidden" name="history" value={JSON.stringify(history)} />
          <input type="hidden" name="extracted" value={JSON.stringify(extracted)} />
          <input type="hidden" name="photo_path" value={scan?.res?.photoPath ?? ""} />
          <input type="hidden" name="served_by" value={scan?.res?.servedBy ?? "manual"} />

          <SubmitButton
            pendingText="Saving…"
            data-confirm-title="Save this bill?"
            data-confirm-body="You can't edit a bill after saving. It goes on this month's ranking, or to the barangay for a check if something looks off."
            data-confirm-label="Save bill"
          >
            Save bill
          </SubmitButton>
        </fieldset>
      </ValidatedForm>
    </div>
  );
}

/** Price per kWh worked out from the two fields above, so a typo shows up before saving. */
function RateLine({ kwh, amount }: { kwh: number; amount: number }) {
  if (!(kwh > 0 && amount > 0)) return null;
  const rate = effectiveRate(amount, kwh);
  if (rate >= RATE_MIN && rate <= RATE_MAX) {
    return (
      <p aria-live="polite" className="-mt-2 text-small text-muted">
        That&apos;s <span className="num font-semibold text-text">{peso(rate)}</span> per kWh.
      </p>
    );
  }
  return (
    <Notice tone="warning">
      That&apos;s <span className="num font-semibold">{peso(rate)}</span> per kWh. Meralco bills are usually {peso(RATE_MIN)} to {peso(RATE_MAX)}, so check the kWh and
      amount. If they&apos;re right, the barangay will check this bill before it&apos;s ranked.
    </Notice>
  );
}
