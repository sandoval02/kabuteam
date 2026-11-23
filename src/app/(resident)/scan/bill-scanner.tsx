"use client";

import { useEffect, useRef, useState } from "react";
import { ScanLine } from "lucide-react";
import { PhotoCapture, postPhoto } from "@/components/photo-capture";
import { Button, Field, Notice } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { baselineFromHistory, type HistoryEntry } from "@/lib/scoring";
import type { BillExtraction } from "@/lib/extraction/schemas";
import { ValidatedForm } from "@/components/form";
import { saveBill } from "../actions";

type ExtractResponse = { extraction: BillExtraction | null; servedBy: string; photoPath: string | null };
type Stage =
  | { kind: "idle" }
  | { kind: "reading"; preview: string }
  | { kind: "review"; preview: string | null; res: ExtractResponse | null; note?: string };

export function BillScanner() {
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const [retake, setRetake] = useState(false);
  const previewRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  async function onPhoto(file: File) {
    setRetake(false);
    const preview = URL.createObjectURL(file);
    previewRef.current = preview;
    setStage({ kind: "reading", preview });
    const { data, error } = await postPhoto<ExtractResponse>("/api/extract/bill", file);
    // The preview is only shown while reading; the review form uses the saved photo path.
    URL.revokeObjectURL(preview);
    if (previewRef.current === preview) previewRef.current = null;
    if (error || !data) {
      setStage({ kind: "review", preview: null, res: null, note: error });
    } else if (!data.extraction) {
      setStage({ kind: "review", preview: null, res: data, note: "Could not read this automatically. Type the numbers from your bill." });
    } else if (!data.extraction.readable) {
      // A bad photo won't improve with another model: ask for a retake (saves AI quota).
      setStage({ kind: "idle" });
      setRetake(true);
    } else {
      setStage({ kind: "review", preview: null, res: data });
    }
  }

  if (stage.kind !== "review") {
    return (
      <div className="flex flex-col gap-3">
        {retake && (
          <Notice tone="warning">That photo could not be read as a bill. Retake it flat, in good light, with the whole page in view.</Notice>
        )}
        {stage.kind === "reading" ? (
          <div className="relative overflow-hidden rounded-md bg-surface shadow-receipt" aria-live="polite">
            {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
            <img src={stage.preview} alt="Your bill photo" className="max-h-64 w-full object-contain opacity-50" />
            <p className="absolute inset-0 flex items-center justify-center gap-2 font-semibold">
              <ScanLine size={15} aria-hidden className="animate-pulse" />
              Reading your bill…
            </p>
          </div>
        ) : (
          <p className="text-muted">Lay the bill flat in good light and fit the whole page in the photo.</p>
        )}
        <PhotoCapture label="Take photo of your bill" onPhoto={onPhoto} disabled={stage.kind === "reading"} />
        <Button variant="ghost" type="button" disabled={stage.kind === "reading"} onClick={() => setStage({ kind: "review", preview: null, res: null })}>
          Type it in instead
        </Button>
      </div>
    );
  }

  const ex = stage.res?.extraction ?? null;
  const history: HistoryEntry[] = ex?.history ?? [];
  const month = ex?.period_end?.slice(0, 7);
  const baseline = month ? baselineFromHistory(history, month) : null;
  const extracted = ex ? { kwh: ex.kwh, amountDue: ex.amount_due, baseline } : null;

  return (
    <ValidatedForm action={saveBill} schema="bill">
      {stage.note && <Notice tone="warning">{stage.note}</Notice>}
      {ex && <Notice tone="info">Check each number against your bill. Fix anything that is wrong before saving.</Notice>}

      <Field label="Account number" name="account_number" inputMode="numeric" autoComplete="off" required maxLength={15} placeholder="10 digits on your bill" defaultValue={ex?.account_number ?? ""} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Period start" name="period_start" type="date" required defaultValue={ex?.period_start ?? ""} />
        <Field label="Period end" name="period_end" type="date" required defaultValue={ex?.period_end ?? ""} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="kWh used" name="kwh" type="number" inputMode="decimal" step="0.01" min="0" required defaultValue={ex?.kwh ?? ""} />
        <Field label="Amount due (₱)" name="amount_due" type="number" inputMode="decimal" step="0.01" min="0" required defaultValue={ex?.amount_due ?? ""} />
      </div>
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
      <input type="hidden" name="photo_path" value={stage.res?.photoPath ?? ""} />
      <input type="hidden" name="served_by" value={stage.res?.servedBy ?? "manual"} />

      <SubmitButton
        pendingText="Saving…"
        data-confirm-title="Save this bill?"
        data-confirm-body="You can't edit a bill after saving. It goes on this month's ranking, or to the barangay for a check if something looks off."
        data-confirm-label="Save bill"
      >
        Looks right, save
      </SubmitButton>
      <Button variant="secondary" type="button" onClick={() => setStage({ kind: "idle" })}>
        Retake photo
      </Button>
    </ValidatedForm>
  );
}
