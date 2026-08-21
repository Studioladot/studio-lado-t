import { Skeleton, SkeletonCard, SkeletonKpiRow } from '@/components/features/skeleton'

export default function CampaignDetailLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-5 w-64" />
      <SkeletonKpiRow columns={4} />
      <SkeletonCard lines={6} />
      <SkeletonCard lines={4} />
    </div>
  )
}
