import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div role="status">
      <span className="sr-only">Loading…</span>
      <div className="flex flex-col items-center gap-2 pt-2">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-3.5 w-48" />
      </div>
      <div className="mt-5 grid grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <Skeleton className="h-12 w-12 rounded-full" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-md bg-surface p-3.5 shadow-receipt">
        <Skeleton className="mb-4 h-5 w-24" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
