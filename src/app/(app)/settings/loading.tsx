import { Skeleton } from "@/components/ui/bits";

export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-48 rounded-3xl" />
      ))}
    </div>
  );
}
