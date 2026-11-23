import { Skeleton } from "@/components/ui";

export default function HomeLoading() {
  return (
    <>
      <p role="status" className="sr-only">
        Loading home
      </p>

      <div aria-hidden className="pt-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-1 h-9 w-40" />
        <Skeleton className="mt-1 h-4 w-56" />
      </div>

      <div aria-hidden className="mt-5 grid grid-cols-4 gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <Skeleton className="h-12 w-12 rounded-full" />
            <Skeleton className="h-3 w-14" />
          </div>
        ))}
      </div>

      <div aria-hidden className="mt-6">
        <Skeleton className="h-40 w-full rounded-md" />
      </div>
    </>
  );
}
