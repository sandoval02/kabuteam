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
        <PageTitle sub="Type the 6-character code under the customer's QR, or scan the QR.">Redeem voucher</PageTitle>

        <div aria-hidden className="flex flex-col gap-4">
          <Skeleton className="h-16 w-full rounded-sm" />
          <Skeleton className="h-10 w-full rounded-full" />
        </div>

        {/* "Redeemed here": waiting / paid header, then voucher rows with a status */}
        <section aria-hidden className="mt-8">
          <Skeleton className="mb-2.5 h-6 w-32" />
          <div className="rounded-md bg-surface shadow-receipt">
            <div className="grid grid-cols-2 gap-3 border-b border-dashed border-border-strong px-4 py-3">
              <div>
                <Skeleton className="h-3 w-28" />
                <Skeleton className="mt-2 h-6 w-24" />
              </div>
              <div className="flex flex-col items-end">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="mt-2 h-6 w-24" />
              </div>
            </div>
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0">
                <div>
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="mt-1.5 h-3 w-32" />
                </div>
                <Skeleton className="h-4 w-14" />
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
