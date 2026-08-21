import { Skeleton, SkeletonGrid, SkeletonKpiRow } from '@/components/features/skeleton'

export default function CampaignsLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-5 w-48" />
      <SkeletonKpiRow columns={4} />
      <SkeletonGrid count={6} columns={3} />
    </div>
  )
}
