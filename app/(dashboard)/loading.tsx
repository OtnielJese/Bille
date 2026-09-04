import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border bg-card p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-8 w-32" />
            <Skeleton className="mt-3 h-3 w-20" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border bg-card p-6 lg:col-span-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-4 h-[220px] w-full" />
        </div>
        <div className="rounded-2xl border bg-card p-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-4 h-[220px] w-full" />
        </div>
      </div>
    </div>
  );
}
