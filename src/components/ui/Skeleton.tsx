interface SkeletonProps {
  className?: string;
  lines?: number;
  height?: string;
}

export const Skeleton = ({ className = '', height = 'h-4' }: SkeletonProps) => (
  <div className={`skeleton ${height} ${className}`} />
);

export const SkeletonCard = () => (
  <div className="bg-[#16161f] border border-white/5 rounded-2xl p-4 space-y-3">
    <div className="flex items-center gap-3">
      <Skeleton className="w-12 h-12 rounded-full" height="h-12" />
      <div className="flex-1 space-y-2">
        <Skeleton className="w-3/4" height="h-4" />
        <Skeleton className="w-1/2" height="h-3" />
      </div>
    </div>
    <Skeleton className="w-full" height="h-3" />
    <Skeleton className="w-4/5" height="h-3" />
  </div>
);

export const SkeletonGameCard = () => (
  <div className="bg-[#16161f] border border-white/5 rounded-2xl overflow-hidden">
    <Skeleton className="w-full" height="h-40" />
    <div className="p-4 space-y-2">
      <Skeleton className="w-2/3" height="h-5" />
      <Skeleton className="w-1/2" height="h-4" />
    </div>
  </div>
);

export const SkeletonList = ({ count = 5 }: { count?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 p-3 bg-[#16161f] rounded-xl border border-white/5">
        <Skeleton className="w-10 h-10 rounded-full" height="h-10" />
        <div className="flex-1 space-y-2">
          <Skeleton className="w-1/2" height="h-4" />
          <Skeleton className="w-1/3" height="h-3" />
        </div>
        <Skeleton className="w-16" height="h-6" />
      </div>
    ))}
  </div>
);
