import { Skeleton, SkeletonCard } from '@/components/features/skeleton'

export default function ScriptDetailLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-5 w-56" />
      <SkeletonCard lines={10} />
    </div>
  )
}
