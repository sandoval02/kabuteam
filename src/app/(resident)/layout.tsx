import { requireViewer } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "./bottom-nav";

export default async function ResidentLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireViewer("resident");
  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col">
      <AppHeader title={viewer.householdLabel} sub={viewer.barangayName} />
      <main className="flex-1 px-4 pb-28 pt-2">{children}</main>
      <BottomNav />
    </div>
  );
}
