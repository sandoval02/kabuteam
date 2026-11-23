import { reconcile, swapTip } from "@/lib/scoring";

// Example household for the homepage, labelled "Example" in the UI. The receipt and the tip come from
// the app's real reconcile() and swapTip(), so the page shows exactly what a resident would see.
export const EXAMPLE_HOUSEHOLD = "Bahay #014";
export const EXAMPLE_PERIOD = "Oct 2026";
const BILL = { kwh: 250, amountDue: 3140, days: 30 };

export const EXAMPLE_AIRCON = { id: "aircon", label: "Aircon", type: "aircon", watts: 1000, hoursPerDay: 4, isInverter: false };
const APPLIANCES = [
  EXAMPLE_AIRCON,
  { id: "ref", label: "Refrigerator", type: "refrigerator", watts: 150, hoursPerDay: 10, isInverter: null },
  { id: "fan", label: "Electric fan", type: "electric_fan", watts: 60, hoursPerDay: 10, isInverter: null },
  { id: "tv", label: "TV", type: "tv", watts: 100, hoursPerDay: 4, isInverter: null },
];

export const EXAMPLE_RECEIPT = reconcile(APPLIANCES, BILL);
export const EXAMPLE_TIP = swapTip(EXAMPLE_RECEIPT.lines[0]);

export const VOUCHER_CODE = "K7QM4P";
