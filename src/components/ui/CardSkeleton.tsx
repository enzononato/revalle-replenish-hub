import { Skeleton } from '@/components/ui/skeleton';

export function StatCardSkeleton() {
  return (
    <div className="card-stats animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-16" />
        </div>
        <Skeleton className="h-10 w-10 rounded-lg" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header skeleton */}
      <div className="rounded-xl bg-muted/30 p-4 animate-fade-in">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-32" />
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Rankings and alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card-stats animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-8" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card-stats animate-fade-in h-64">
          <Skeleton className="h-4 w-32 mb-4" />
          <Skeleton className="h-full w-full rounded-lg" />
        </div>
        <div className="card-stats animate-fade-in h-64">
          <Skeleton className="h-4 w-32 mb-4" />
          <Skeleton className="h-full w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function ProtocoloCardSkeleton() {
  return (
    <div className="flex gap-4 p-4 border-b border-border animate-fade-in">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-3 w-48" />
        <div className="flex gap-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-80 border-r border-border p-4 space-y-3">
        <Skeleton className="h-10 w-full rounded-lg" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-2 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
      
      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-border">
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="flex-1 p-4 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
              <Skeleton className={`h-12 ${i % 2 === 0 ? 'w-48' : 'w-64'} rounded-lg`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
