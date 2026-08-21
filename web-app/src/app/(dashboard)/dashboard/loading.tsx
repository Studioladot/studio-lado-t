import { Skeleton, SkeletonCard, SkeletonKpiRow } from '@/components/features/skeleton'

export default function DashboardLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-5 w-48" />
      <SkeletonKpiRow columns={4} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SkeletonCard lines={5} />
        <SkeletonCard lines={5} />
      </div>
    </div>
  )
}
