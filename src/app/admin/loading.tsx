import { PageTitle, Skeleton } from "@/components/ui";

export default function AdminLoading() {
  return (
    <div className="mx-auto min-h-dvh max-w-240">
      <div aria-hidden className="flex h-14 items-center gap-2.5 px-4">
        <Skeleton className="h-9 w-9" />
        <div className="flex-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-1 h-3 w-44" />
        </div>
      </div>

      <main className="px-4 pb-12 pt-2">
        <p role="status" className="sr-only">
          Loading admin
        </p>
        <PageTitle>Admin</PageTitle>

        <section aria-hidden className="mb-6">
          <Skeleton className="mb-2.5 h-6 w-40" />
          <Skeleton className="h-32 w-full rounded-md" />
        </section>

        <div aria-hidden className="grid gap-8 md:grid-cols-2">
          <section>
            <Skeleton className="mb-2.5 h-6 w-36" />
            <Skeleton className="h-48 w-full rounded-md" />
          </section>
          {/* Partner stores: name, Unpaid / Paid, then the record-payment form */}
          <section>
            <Skeleton className="mb-2.5 h-6 w-32" />
            <div className="rounded-md bg-surface p-4 shadow-receipt">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="mt-1.5 h-3 w-20" />
                </div>
                <div className="flex flex-col items-end">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="mt-1.5 h-3 w-20" />
                </div>
              </div>
              <Skeleton className="mt-4 h-10 w-full rounded-sm" />
              <Skeleton className="mt-3 h-10 w-full rounded-full" />
            </div>
          </section>
        </div>

        {/* Barangay: name and monthly voucher budget side by side */}
        <section aria-hidden className="mt-8 grid gap-6 md:grid-cols-2">
          <Skeleton className="h-24 w-full rounded-md" />
          <Skeleton className="h-24 w-full rounded-md" />
        </section>
      </main>
    </div>
  );
}
