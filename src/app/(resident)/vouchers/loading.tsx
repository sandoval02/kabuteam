import { PageTitle, Skeleton } from "@/components/ui";

export default function VouchersLoading() {
  return (
    <>
      <p role="status" className="sr-only">
        Loading vouchers
      </p>
      <PageTitle sub="Show the QR code at the partner store.">Vouchers</PageTitle>

      <div aria-hidden className="rounded-md bg-surface p-4 shadow-receipt">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="mt-2 h-4 w-32" />
        <div className="mt-4 flex flex-col items-center gap-2">
          <Skeleton className="h-60 w-60" />
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-4 w-52" />
        </div>
      </div>
    </>
  );
}
