// app/analyze/components/MarketContext/LoadingSkeletons.jsx
// Task 5.1: Loading States & Skeletons

'use client'

import { Skeleton } from '@/components/ui/skeleton'

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-8 w-24" />
      </div>

      {/* Time Period Selector Skeleton */}
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-10 w-24" />
        ))}
      </div>

      {/* Market State Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-black/40 rounded-xl p-4 border border-slate-700/50">
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>

      {/* Chart Skeleton */}
      <div className="bg-black/40 rounded-xl p-5 border border-slate-700/50">
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    </div>
  )
}

export function ChartSkeleton({ height = 400 }) {
  return (
    <div className="bg-black/40 rounded-xl p-5 border border-slate-700/50">
      <Skeleton className="h-6 w-48 mb-4" />
      <Skeleton className={`h-[${height}px] w-full`} style={{ height: `${height}px` }} />
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="bg-black/40 rounded-xl p-4 border border-slate-700/50">
      <Skeleton className="h-4 w-24 mb-3" />
      <Skeleton className="h-8 w-32 mb-2" />
      <Skeleton className="h-4 w-20" />
    </div>
  )
}

export function ListSkeleton({ count = 5 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-black/40 rounded-lg p-4 border border-slate-700/50">
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="bg-black/40 rounded-xl p-5 border border-slate-700/50">
      <Skeleton className="h-6 w-48 mb-4" />
      <div className="space-y-3">
        {/* Header */}
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {Array.from({ length: cols }).map((_, colIdx) => (
              <Skeleton key={colIdx} className="h-4 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
