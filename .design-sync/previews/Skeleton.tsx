import { Skeleton } from 'world-building-kit'

export const LoadingCard = () => (
  <div className="flex w-80 items-start gap-4">
    <Skeleton className="h-12 w-12 rounded-full" />
    <div className="grid flex-1 gap-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-20 w-full rounded-md" />
    </div>
  </div>
)

export const LoadingList = () => (
  <div className="grid w-80 gap-3">
    <Skeleton className="h-8 w-full" />
    <Skeleton className="h-8 w-full" />
    <Skeleton className="h-8 w-2/3" />
  </div>
)
