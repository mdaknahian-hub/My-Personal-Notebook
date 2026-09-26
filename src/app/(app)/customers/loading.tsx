import { ListSkeleton, Skeleton } from "@/components/ui/bits";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-32 rounded-2xl" />
      <ListSkeleton rows={6} />
    </div>
  );
}
