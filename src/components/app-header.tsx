import { LogOut } from "lucide-react";
import { signOut } from "@/app/login/actions";

export function AppHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <header className="flex items-center justify-between gap-4 px-4 py-3">
      <div>
        <p className="num text-small font-semibold tracking-wide text-primary">TIPIDTAYO</p>
        <p className="font-semibold">
          {title}
          {sub && <span className="font-normal text-muted"> · {sub}</span>}
        </p>
      </div>
      <form action={signOut}>
        <button
          type="submit"
          className="flex h-11 cursor-pointer items-center gap-2 rounded-sm px-3 text-small text-muted hover:bg-surface"
        >
          <LogOut size={20} strokeWidth={1.75} aria-hidden />
          Sign out
        </button>
      </form>
    </header>
  );
}
