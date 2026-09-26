import { Skeleton } from "@/components/ui/bits";

export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <Skeleton className="h-28 rounded-2xl" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-3xl" />
        ))}
      </div>
    </div>
  );
}
