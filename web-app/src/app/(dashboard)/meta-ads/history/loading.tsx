import { Skeleton, SkeletonCard } from '@/components/features/skeleton'

export default function HistoryLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-5 w-40" />
      <SkeletonCard lines={8} />
    </div>
  )
}
