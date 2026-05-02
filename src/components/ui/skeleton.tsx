import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}



// 2. Stats Grid Skeleton
export const SkeletonStatsGrid = ({ items = 3, columns = 3 }: { items?: number; columns?: number }) => {
  const gridCols = {
    1: 'md:grid-cols-1',
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
    5: 'lg:grid-cols-5 md:grid-cols-2',
  }[columns as 1|2|3|4|5] || 'md:grid-cols-3';

  return (
    <div className={cn("grid grid-cols-1 gap-6 mb-6", gridCols)}>
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="rounded-lg border p-6 flex items-center gap-4 bg-card shadow-sm">
        <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-7 w-1/3" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      </div>
    ))}
    </div>
  );
};

// 3. Table Skeleton
export const SkeletonTable = ({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) => (
  <div className="rounded-md border bg-card overflow-hidden">
    <div className="p-4 border-b">
      <div className="flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={`header-${i}`} className="h-4 flex-1" />
        ))}
      </div>
    </div>
    <div className="p-4 space-y-6">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex gap-4">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <Skeleton key={`cell-${rowIndex}-${colIndex}`} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  </div>
);

// 4. Chart Skeleton
export const SkeletonChart = ({ className }: { className?: string }) => (
  <div className={cn("p-6 rounded-lg border bg-card shadow-sm space-y-4", className)}>
    <div className="space-y-2">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
    <Skeleton className="h-[250px] w-full rounded-lg" />
  </div>
);

// 5. List Skeleton
export const SkeletonList = ({ items = 5 }: { items?: number }) => (
  <div className="space-y-4">
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="flex items-center space-x-4 p-4 rounded-lg border bg-card">
        <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-8 w-16 rounded-md" />
      </div>
    ))}
  </div>
);

// 6. Form Skeleton
export const SkeletonForm = ({ fields = 4 }: { fields?: number }) => (
  <div className="space-y-6 p-6 rounded-lg border bg-card">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
    <div className="flex justify-end gap-3 pt-4">
      <Skeleton className="h-10 w-24" />
      <Skeleton className="h-10 w-24" />
    </div>
  </div>
);

// 7. Card Skeleton (General purpose)
export const SkeletonCard = ({ className }: { className?: string }) => (
  <div className={cn("rounded-lg border bg-card p-6 shadow-sm space-y-4", className)}>
    <div className="space-y-2">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
    <div className="space-y-3">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  </div>
);

export const SkeletonText = ({ lines = 3 }: { lines?: number }) => (
  <div className="space-y-2">
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} className={`h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`} />
    ))}
  </div>
);
 
// 8. Page Header Skeleton
export const SkeletonPageHeader = () => (
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
    <div className="space-y-2">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96" />
    </div>
    <div className="flex gap-2">
      <Skeleton className="h-10 w-32 rounded-md" />
      <Skeleton className="h-10 w-32 rounded-md" />
    </div>
  </div>
);

export { Skeleton }
