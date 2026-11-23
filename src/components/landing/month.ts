/** One Meralco billing cycle in a barangay, day by day. Example dates; each role acts on its own day. */
export const MONTH = [
  { id: "bill", date: "Oct 1", who: "", title: "Bill arrives", line: "One number on paper." },
  { id: "scan", date: "Oct 2", who: "You", title: "Scan it", line: "Get a receipt." },
  { id: "appliances", date: "Oct 2", who: "You", title: "Add stickers", line: "Watts from the nameplate." },
  { id: "ranking", date: "Oct 31", who: "Barangay", title: "Ranking posted", line: "By % saved." },
  { id: "voucher", date: "Nov 3", who: "Store", title: "Voucher redeemed", line: "Once, at the counter." },
  { id: "report", date: "Month 3", who: "Council", title: "Savings reported", line: "kWh and pesos vs last year." },
] as const;

export type DayId = (typeof MONTH)[number]["id"];
