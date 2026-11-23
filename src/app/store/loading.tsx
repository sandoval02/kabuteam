import { PageTitle, Skeleton } from "@/components/ui";

export default function StoreLoading() {
  return (
    <div className="mx-auto min-h-dvh max-w-[480px]">
      <div aria-hidden className="flex h-14 items-center gap-2.5 px-4">
        <Skeleton className="h-9 w-9" />
        <div className="flex-1">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-1 h-3 w-40" />
        </div>
      </div>

      <main className="px-4 pb-12 pt-2">
        <p role="status" className="sr-only">
          Loading store
        </p>
        <PageTitle sub="Scan or type the code on the customer's phone.">Redeem voucher</PageTitle>

        <div aria-hidden className="flex flex-col gap-4">
          <Skeleton className="h-10 w-full rounded-sm" />
          <Skeleton className="h-10 w-full rounded-full" />
          <Skeleton className="h-10 w-full rounded-full" />
        </div>
      </main>
    </div>
  );
}
