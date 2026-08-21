import { Skeleton, SkeletonCard, SkeletonKpiRow } from '@/components/features/skeleton'

export default function SalesLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-5 w-56" />
      <SkeletonKpiRow columns={4} />
      <SkeletonKpiRow columns={4} />
      <SkeletonCard lines={6} />
    </div>
  )
}
