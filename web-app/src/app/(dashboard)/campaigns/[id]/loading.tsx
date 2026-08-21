import { Skeleton, SkeletonCard, SkeletonGrid } from '@/components/features/skeleton'

export default function CampaignPiecesLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-5 w-56" />
      <SkeletonCard lines={3} />
      <SkeletonGrid count={6} columns={3} />
    </div>
  )
}
