import { Skeleton } from "@/components/ui";

/** Mirrors the home page: amount due + trend, four quick actions, then the Costs/Usage/Tips card. */
export default function Loading() {
  return (
    <div role="status">
      <span className="sr-only">Loading…</span>
      <div className="flex flex-col items-center gap-2 pt-2">
        <Skeleton className="h-3.5 w-36" />
        <Skeleton className="h-10 w-44" />
        <Skeleton className="h-3.5 w-48" />
        <Skeleton className="h-12 w-28" />
      </div>
      <div className="mt-5 grid grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <Skeleton className="h-12 w-12 rounded-full" />
            <Skeleton className="h-3 w-14" />
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-md bg-surface p-3.5 shadow-receipt">
        <div className="flex gap-6 border-b border-border pb-2">
          <Skeleton className="h-5 w-14" />
          <Skeleton className="h-5 w-14" />
          <Skeleton className="h-5 w-10" />
        </div>
        <Skeleton className="mt-3 h-10" />
        <div className="mt-1 flex flex-col">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5">
              <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-3.5 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <Skeleton className="h-3.5 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
