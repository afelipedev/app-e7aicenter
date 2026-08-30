import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-live="polite">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-9 w-52" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-40 w-full rounded-[12px]" />
      </div>
      <Skeleton className="h-[108px] w-full rounded-[12px]" />
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <Skeleton className="h-72 w-full rounded-[12px]" />
          <Skeleton className="h-24 w-full rounded-[12px]" />
        </div>
        <Skeleton className="h-72 w-full rounded-[12px]" />
      </div>
    </div>
  );
}
