import { Skeleton } from "@/components/ui";

/** Mirrors the profile page: header, avatar + name, personal info rows, name form, appearance. */
export default function Loading() {
  return (
    <div role="status" className="mx-auto min-h-dvh max-w-[480px]">
      <span className="sr-only">Loading profile…</span>
      <div className="flex h-14 items-center gap-2.5 px-4">
        <Skeleton className="h-9 w-9 rounded-full" />
        <div className="flex flex-1 flex-col gap-1.5">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>
      <div className="px-4 pb-12 pt-1">
        <Skeleton className="mb-3 h-9 w-16 rounded-full" />
        <div className="mb-5 flex flex-col items-center gap-2">
          <Skeleton className="h-24 w-24 rounded-full" />
          <Skeleton className="mt-1 h-7 w-36" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="mb-3 rounded-md bg-surface p-3.5 shadow-receipt">
          <Skeleton className="mb-3 h-4 w-28" />
          <div className="flex flex-col gap-4">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-3.5 w-3.5 shrink-0" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3.5 w-40" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mb-3 rounded-md bg-surface p-3.5 shadow-receipt">
          <Skeleton className="mb-3 h-4 w-28" />
          <Skeleton className="mb-1.5 h-3.5 w-12" />
          <Skeleton className="h-10" />
          <Skeleton className="mt-3 h-10 rounded-full" />
        </div>
        <div className="rounded-md bg-surface p-3.5 shadow-receipt">
          <Skeleton className="mb-3 h-4 w-24" />
          <Skeleton className="h-10 rounded-full" />
        </div>
      </div>
    </div>
  );
}
