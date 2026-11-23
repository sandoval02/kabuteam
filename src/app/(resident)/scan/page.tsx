import { Plug, ReceiptText, ScanLine } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { getAppliances, getLatestBill, monthLabel } from "@/lib/data";
import { CardSection, Notice, PageHero, kwh } from "@/components/ui";
import { DeleteAppliance } from "./delete-appliance";
import { BillScanner } from "./bill-scanner";
import { ApplianceForm } from "./appliance-form";

export default async function ScanPage() {
  const viewer = await requireViewer("resident");
  const [bill, appliances] = await Promise.all([getLatestBill(viewer.householdId), getAppliances(viewer.householdId)]);

  return (
    <>
      <PageHero icon={ScanLine} title="Scan" sub="Your bill shows the total. Your appliances show where it goes." />

      <CardSection title="Electric bill" icon={ReceiptText}>
        {bill && (
          <div className="mb-3">
            <Notice tone="info">
              Last saved: {monthLabel(bill.score_month)} bill, {kwh(bill.kwh)}. Scan your next bill when it arrives.
            </Notice>
          </div>
        )}
        <BillScanner />
      </CardSection>

      <CardSection title="Appliances" icon={Plug} id="appliances">
        {appliances.length > 0 && (
          <ul className="mb-4 divide-y divide-border">
            {appliances.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2">
                <div>
                  <p className="font-semibold">{a.label}</p>
                  <p className="num text-small text-muted">
                    {a.watts} W · {a.hours_per_day} h/day{a.is_inverter ? " · inverter" : ""}
                  </p>
                </div>
                <DeleteAppliance id={a.id} label={a.label} />
              </li>
            ))}
          </ul>
        )}
        <ApplianceForm />
      </CardSection>
    </>
  );
}
