import { ListSkeleton, Skeleton, StatSkeleton } from "@/components/ui/bits";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatSkeleton key={i} />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-3xl" />
      <ListSkeleton rows={5} />
    </div>
  );
}
