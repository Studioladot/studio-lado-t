import { Skeleton, SkeletonGrid } from '@/components/features/skeleton'

export default function ContentLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-5 w-40" />
      <SkeletonGrid count={8} columns={4} />
    </div>
  )
}
