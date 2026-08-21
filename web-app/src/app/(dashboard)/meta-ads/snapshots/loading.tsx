import { Skeleton, SkeletonCard } from '@/components/features/skeleton'

export default function SnapshotsLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-5 w-48" />
      <SkeletonCard lines={6} />
      <SkeletonCard lines={6} />
    </div>
  )
}
