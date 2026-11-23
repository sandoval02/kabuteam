import { PageTitle, Skeleton } from "@/components/ui";

export default function RankingLoading() {
  return (
    <>
      <p role="status" className="sr-only">
        Loading ranking
      </p>
      <PageTitle>Ranking</PageTitle>

      <div aria-hidden className="mb-4 flex flex-col gap-1">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-3/4" />
      </div>

      <ul aria-hidden className="divide-y divide-border overflow-hidden rounded-md bg-surface shadow-receipt">
        {[0, 1, 2, 3, 4].map((i) => (
          <li key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="h-7 w-8" />
            <div className="flex-1">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="mt-1 h-4 w-20" />
            </div>
            <Skeleton className="h-7 w-14" />
          </li>
        ))}
      </ul>
    </>
  );
}
