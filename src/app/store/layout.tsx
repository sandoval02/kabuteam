import { requireViewer } from "@/lib/auth";

/** Runs before the segment's loading UI, so a resident never sees the store shell. */
export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  await requireViewer("store");
  return children;
}
