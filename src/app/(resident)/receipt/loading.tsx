import { PageTitle, Skeleton } from "@/components/ui";

export default function ReceiptLoading() {
  return (
    <>
      <p role="status" className="sr-only">
        Loading receipt
      </p>
      <PageTitle>Receipt</PageTitle>

      <article aria-hidden className="rounded-md bg-surface p-4 shadow-receipt">
        <div className="flex flex-col items-center gap-2 border-b border-dashed border-border-strong pb-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-52" />
          <Skeleton className="h-4 w-32" />
        </div>
        <ul className="divide-y divide-dashed divide-border py-1">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="flex items-baseline justify-between gap-3 py-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-16" />
            </li>
          ))}
        </ul>
        <div className="flex items-baseline justify-between border-t border-dashed border-border-strong pt-3">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-8 w-24" />
        </div>
      </article>

      <div aria-hidden className="mt-6 flex flex-col gap-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-24 w-full rounded-md" />
        <Skeleton className="h-24 w-full rounded-md" />
      </div>
    </>
  );
}
