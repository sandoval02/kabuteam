import { Skeleton } from "@/components/ui";

/** Mirrors the scan page: Bill/Appliances/Room check pill switch, then the bill card (photo button + form). */
export default function Loading() {
  return (
    <div role="status">
      <span className="sr-only">Loading scan…</span>
      <div className="grid grid-cols-3 gap-1 rounded-full bg-surface p-1 shadow-sheet">
        <Skeleton className="h-10 rounded-full" />
        {[0, 1].map((i) => (
          <span key={i} className="flex h-10 items-center justify-center">
            <Skeleton className="h-3.5 w-20" />
          </span>
        ))}
      </div>
      <div className="mt-3 rounded-md bg-surface p-3.5 shadow-receipt">
        <Skeleton className="mb-3 h-4 w-28" />
        <Skeleton className="mb-1.5 h-3 w-full" />
        <Skeleton className="mb-3 h-3 w-2/3" />
        <Skeleton className="h-10 rounded-full" />
        <Skeleton className="mx-auto my-4 h-3 w-32" />
        <div className="flex flex-col gap-4">
          <Field />
          <div className="grid grid-cols-2 gap-3">
            <Field />
            <Field />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field />
            <Field />
          </div>
          <Field />
          <Skeleton className="h-10 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function Field() {
  return (
    <div className="flex flex-col gap-1.5">
      <Skeleton className="h-3.5 w-24" />
      <Skeleton className="h-10" />
    </div>
  );
}
