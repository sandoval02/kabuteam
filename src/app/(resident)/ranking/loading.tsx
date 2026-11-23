import { Skeleton } from "@/components/ui";

/** Mirrors the ranking page: rank hero, then the households card. */
export default function Loading() {
  return (
    <div role="status">
      <span className="sr-only">Loading ranking…</span>
      <div className="mb-3 rounded-lg bg-surface p-5 shadow-receipt">
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="mt-2 h-9 w-36" />
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-12" />
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-md bg-surface p-3.5 shadow-receipt">
        <Skeleton className="mb-3 h-4 w-28" />
        <Skeleton className="mb-1.5 h-3 w-full" />
        <Skeleton className="mb-4 h-3 w-2/3" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 px-2">
              <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
              <Skeleton className="h-3.5 flex-1" />
              <Skeleton className="h-5 w-14" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
