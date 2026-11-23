import { requireViewer } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "./bottom-nav";

export default async function ResidentLayout({ children }: { children: React.ReactNode }) {
  await requireViewer("resident");
  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col">
      <AppHeader />
      <main className="flex-1 px-4 pb-24 pt-1">{children}</main>
      <BottomNav />
    </div>
  );
}
