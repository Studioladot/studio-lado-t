import { Skeleton, SkeletonGrid } from '@/components/features/skeleton'

export default function LibraryLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-5 w-48" />
      <SkeletonGrid count={6} columns={3} />
    </div>
  )
}
