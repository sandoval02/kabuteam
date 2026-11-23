import { Skeleton } from "@/components/ui";

/** Mirrors the vouchers page: "ready to use" hero, then one voucher card with its QR code. */
export default function Loading() {
  return (
    <div role="status">
      <span className="sr-only">Loading vouchers…</span>
      <div className="mb-3 rounded-lg bg-surface p-5 shadow-receipt">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="mt-2 h-9 w-32" />
        <Skeleton className="mt-2 h-3.5 w-56" />
        <Skeleton className="mt-3 h-3.5 w-48" />
      </div>
      <div className="rounded-md bg-surface p-3.5 shadow-receipt">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="mt-1.5 h-3 w-32" />
        <div className="mt-4 flex flex-col items-center gap-2">
          <Skeleton className="h-60 w-60" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-3 w-56" />
        </div>
      </div>
    </div>
  );
}
