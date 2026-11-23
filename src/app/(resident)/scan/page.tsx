import Link from "next/link";
import { Plug, ReceiptText } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { getAppliances, getLatestBill, monthLabel } from "@/lib/data";
import { CardSection, Notice, buttonStyles, kwh } from "@/components/ui";
import { Tabs } from "@/components/tabs";
import { DeleteAppliance } from "./delete-appliance";
import { BillScanner } from "./bill-scanner";
import { ApplianceForm } from "./appliance-form";

export const metadata = { title: "Scan · Kuryentipid" };

export default async function ScanPage() {
  const viewer = await requireViewer("resident");
  const [bill, appliances] = await Promise.all([getLatestBill(viewer.householdId), getAppliances(viewer.householdId)]);

  return (
    <>
      <h1 className="sr-only">Scan</h1>
      <Tabs
        variant="segmented"
        tabs={[
          {
            id: "bill",
            label: "Bill",
            content: (
              <CardSection title="Electric bill" icon={ReceiptText}>
                {bill && (
                  <div className="mb-3">
                    <Notice tone={bill.status === "rejected" ? "warning" : "info"}>
                      {bill.status === "rejected"
                        ? `The ${monthLabel(bill.score_month)} bill was not verified. Scan a corrected bill for the same month.`
                        : `Last saved: ${monthLabel(bill.score_month)} bill, ${kwh(bill.kwh)}. Scan your next bill when it arrives.`}{" "}
                      <Link href="/receipt" className="font-semibold underline">
                        View receipt
                      </Link>
                    </Notice>
                  </div>
                )}
                <BillScanner />
              </CardSection>
            ),
          },
          {
            id: "appliances",
            label: appliances.length ? `Appliances (${appliances.length})` : "Appliances",
            content: (
              <CardSection title="Appliances" icon={Plug}>
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
                {bill && appliances.length > 0 && (
                  <Link href="/receipt" className={`${buttonStyles.secondary} mt-3 w-full`}>
                    View receipt
                  </Link>
                )}
              </CardSection>
            ),
          },
        ]}
      />
    </>
  );
}
