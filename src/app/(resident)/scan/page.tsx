import { Trash2 } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { getAppliances, getLatestBill, monthLabel } from "@/lib/data";
import { Notice, PageTitle, Section, kwh } from "@/components/ui";
import { deleteAppliance } from "../actions";
import { BillScanner } from "./bill-scanner";
import { ApplianceForm } from "./appliance-form";

export default async function ScanPage() {
  const viewer = await requireViewer("resident");
  const [bill, appliances] = await Promise.all([getLatestBill(viewer.householdId), getAppliances(viewer.householdId)]);

  return (
    <>
      <PageTitle sub="Your bill shows the total. Your appliances show where it goes.">Scan</PageTitle>

      <Section title="Electric bill">
        {bill && (
          <div className="mb-3">
            <Notice tone="info">
              Last saved: {monthLabel(bill.score_month)} bill, {kwh(bill.kwh)}. Scan your next bill when it arrives.
            </Notice>
          </div>
        )}
        <BillScanner />
      </Section>

      <Section title="Appliances">
        {appliances.length > 0 && (
          <ul className="mb-4 divide-y divide-border rounded-md border border-border bg-surface">
            {appliances.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2 pl-4 pr-1">
                <div>
                  <p className="font-semibold">{a.label}</p>
                  <p className="num text-small text-muted">
                    {a.watts} W · {a.hours_per_day} h/day{a.is_inverter ? " · inverter" : ""}
                  </p>
                </div>
                <form action={deleteAppliance}>
                  <input type="hidden" name="id" value={a.id} />
                  <button
                    type="submit"
                    aria-label={`Remove ${a.label}`}
                    className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-sm text-muted hover:bg-error-bg hover:text-error"
                  >
                    <Trash2 size={20} strokeWidth={1.75} aria-hidden />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <ApplianceForm />
      </Section>
    </>
  );
}
