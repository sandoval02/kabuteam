import { ReceiptText, TriangleAlert } from "lucide-react";
import { peso } from "@/components/ui";
import { EXAMPLE_BILL } from "./example-data";

/** Compact receipt proof for the hero. The full explanation lives in the next section. */
export function ReceiptPreview() {
  return (
    <figure className="mt-8 max-w-sm">
      <div className="rounded-md bg-surface p-4 shadow-receipt">
        <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-border-strong pb-2">
          <p className="flex items-center gap-2 text-small font-semibold">
            <ReceiptText size={16} strokeWidth={1.75} aria-hidden />
            Your bill, line by line
          </p>
          <p className="num text-small text-muted">{EXAMPLE_BILL.period}</p>
        </div>
        <ul className="divide-y divide-dashed divide-border py-1">
          {EXAMPLE_BILL.lines.map((line) => (
            <li key={line.label} className="flex items-baseline justify-between gap-3 py-1.5">
              <span className="text-small">
                {line.label}
                <span className="num block text-small text-muted">{line.kwh} kWh</span>
              </span>
              <span className="num text-small font-semibold">{peso(line.pesos)}</span>
            </li>
          ))}
          <li className="flex items-baseline justify-between gap-3 py-1.5 text-warning">
            <span className="flex items-center gap-1.5 text-small">
              <TriangleAlert size={16} aria-hidden className="shrink-0" />
              Unaccounted
            </span>
            <span className="num text-small font-semibold">{peso(EXAMPLE_BILL.unaccounted.pesos)}</span>
          </li>
        </ul>
        <div className="flex items-baseline justify-between gap-3 border-t border-dashed border-border-strong pt-2">
          <span className="text-small font-semibold">Total · {EXAMPLE_BILL.totalKwh} kWh</span>
          <span className="num font-semibold">{peso(EXAMPLE_BILL.totalPesos)}</span>
        </div>
      </div>
    </figure>
  );
}
