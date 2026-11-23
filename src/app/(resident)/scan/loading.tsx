import { PageTitle, Skeleton } from "@/components/ui";

export default function ScanLoading() {
  return (
    <>
      <p role="status" className="sr-only">
        Loading scan
      </p>
      <PageTitle sub="Your bill shows the total. Your appliances show where it goes.">Scan</PageTitle>

      <section aria-hidden className="mb-6">
        <Skeleton className="mb-2.5 h-6 w-32" />
        <Skeleton className="mb-3 h-5 w-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="mt-3 h-11 w-full" />
      </section>

      <section aria-hidden>
        <Skeleton className="mb-2.5 h-6 w-28" />
        <Skeleton className="mb-4 h-24 w-full rounded-md" />
        <Skeleton className="h-11 w-full" />
      </section>
    </>
  );
}
