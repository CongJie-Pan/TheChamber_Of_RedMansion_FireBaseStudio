/**
 * Skeleton screen for comment loading
 *
 * Provides better perceived performance by showing placeholder UI
 * instead of a blank loading spinner
 */
export function CommentSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3 mt-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-2 animate-pulse">
          {/* Avatar skeleton */}
          <div className="w-8 h-8 bg-muted rounded-full flex-shrink-0" />

          <div className="flex-1 space-y-2">
            {/* Author name skeleton */}
            <div className="h-4 bg-muted rounded w-1/4" />

            {/* Comment content skeleton */}
            <div className="space-y-1">
              <div className="h-3 bg-muted rounded w-full" />
              <div className="h-3 bg-muted rounded w-3/4" />
            </div>

            {/* Timestamp skeleton */}
            <div className="h-3 bg-muted rounded w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}
