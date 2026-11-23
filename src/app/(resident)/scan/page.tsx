import Link from "next/link";
import { Plug, ReceiptText } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { getAppliances, getLatestBill, monthLabel } from "@/lib/data";
import { Notice, PageTitle, Section, buttonStyles, kwh } from "@/components/ui";
import { DeleteAppliance } from "./delete-appliance";
import { BillScanner } from "./bill-scanner";
import { ApplianceForm } from "./appliance-form";

export const metadata = { title: "Scan · TipidTayo" };

export default async function ScanPage() {
  const viewer = await requireViewer("resident");
  const [bill, appliances] = await Promise.all([getLatestBill(viewer.householdId), getAppliances(viewer.householdId)]);

  return (
    <>
      <PageTitle sub="Your bill shows the total. Your appliances show where it goes.">Scan</PageTitle>

      <Section title="Electric bill" icon={ReceiptText}>
        {bill && (
          <div className="mb-3">
            <Notice tone={bill.status === "rejected" ? "warning" : "info"}>
              {bill.status === "rejected"
                ? `The ${monthLabel(bill.score_month)} bill was not verified. Scan a corrected bill for the same month, or ask the barangay.`
                : `Last saved: ${monthLabel(bill.score_month)} bill, ${kwh(bill.kwh)}. Scan your next bill when it arrives.`}{" "}
              <Link href="/receipt" className="font-semibold underline">
                View receipt
              </Link>
            </Notice>
          </div>
        )}
        <BillScanner />
      </Section>

      <Section title="Appliances" icon={Plug} id="appliances">
        {appliances.length > 0 && (
          <ul className="mb-4 divide-y divide-border rounded-md bg-surface shadow-receipt">
            {appliances.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2 pl-4 pr-1">
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
        {bill && appliances.length > 0 && (
          <Link href="/receipt" className={`${buttonStyles.secondary} mt-3 w-full`}>
            View receipt
          </Link>
        )}
      </Section>
    </>
  );
}
