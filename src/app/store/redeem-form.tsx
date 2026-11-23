"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { QrCode, X } from "lucide-react";
import { Button, Field, Notice, peso } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { ValidatedForm } from "@/components/form";
import { redeem, type RedeemState } from "./actions";

type Detector = { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
declare global {
  interface Window {
    BarcodeDetector?: new (opts: { formats: string[] }) => Detector;
  }
}

export function RedeemForm() {
  const [state, setState] = useState<RedeemState>({});
  const [code, setCode] = useState("");
  const [scanning, setScanning] = useState(false);
  // Native QR scanning (Chrome on Android). Elsewhere the typed code works the same.
  const canScan = useSyncExternalStore(
    () => () => {},
    () => !!window.BarcodeDetector,
    () => false,
  );
  const video = useRef<HTMLVideoElement>(null);
  const submit = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!scanning || !window.BarcodeDetector) return;
    const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
    let stream: MediaStream | null = null;
    let stopped = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        while (!stopped) {
          const found = await detector.detect(video.current).catch(() => []);
          if (found[0]?.rawValue) {
            setCode(found[0].rawValue.toUpperCase());
            setScanning(false);
            setTimeout(() => submit.current?.click(), 0);
            break;
          }
          await new Promise((r) => setTimeout(r, 250));
        }
      } catch {
        setScanning(false);
      }
    })();
    return () => {
      stopped = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [scanning]);

  return (
    <div className="flex flex-col gap-4">
      {state.message && state.tone && (
        <Notice tone={state.tone}>
          <span className="block">{state.message}</span>
          {state.amount !== undefined && <span className="num block text-amount-lg font-semibold">{peso(state.amount)}</span>}
        </Notice>
      )}

      {scanning && (
        <div className="relative overflow-hidden rounded-md border border-border bg-text">
          <video ref={video} className="aspect-square w-full object-cover" muted playsInline aria-label="Camera view for scanning" />
          <Button variant="secondary" type="button" className="absolute right-2 top-2" onClick={() => setScanning(false)}>
            <X size={15} aria-hidden />
            Close
          </Button>
        </div>
      )}

      <ValidatedForm action={redeem} schema="voucherCode" onResult={setState}>
        <Field
          label="Voucher code"
          name="code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          autoCapitalize="characters"
          autoComplete="off"
          maxLength={6}
          required
          inputMode="text"
          inputClassName="num h-16 text-center text-[1.75rem] font-semibold uppercase tracking-[0.3em]"
          hint="6 letters and numbers, printed under the QR code"
        />
        <SubmitButton ref={submit} pendingText="Checking…">
          Redeem
        </SubmitButton>
      </ValidatedForm>
      {canScan && !scanning && (
        <Button variant="secondary" type="button" onClick={() => setScanning(true)}>
          <QrCode size={15} strokeWidth={1.75} aria-hidden />
          Scan QR code
        </Button>
      )}
    </div>
  );
}
