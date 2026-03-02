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

function AutomationCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("panel space-y-4 p-5", className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-4 w-2/3" />
      <div className="flex gap-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  )
}

function AutomationListSkeleton() {
  return (
    <div className="grid gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <AutomationCardSkeleton key={i} />
      ))}
    </div>
  )
}

function TemplateCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("panel space-y-4 p-5", className)}>
      <Skeleton className="h-6 w-1/2" />
      <Skeleton className="h-4 w-3/4" />
      <div className="flex gap-2">
        <Skeleton className="h-5 w-12 rounded-full" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="panel space-y-4 p-8">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-5 w-96" />
      </div>
      <AutomationListSkeleton />
    </div>
  )
}

export { Skeleton, AutomationCardSkeleton, AutomationListSkeleton, TemplateCardSkeleton, DashboardSkeleton }
