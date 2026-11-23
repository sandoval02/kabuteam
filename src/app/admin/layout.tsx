import { requireViewer } from "@/lib/auth";

/** Runs before the segment's loading UI, so a resident never sees the admin shell. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireViewer("admin");
  return children;
}
