// app/components/LoadingSkeletons.js
'use client'

import { Skeleton } from '@/components/ui'

/**
 * Hero Section Loading Skeleton
 * Matches the layout of the P&L hero card
 */
export function HeroSkeleton() {
  return (
    <div className="space-y-6">
      {/* Main P&L Card Skeleton */}
      <div className="relative">
        <div className="relative bg-slate-900 backdrop-blur-xl border border-slate-700/50 rounded-2xl md:rounded-3xl p-6 md:p-8 lg:p-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
            {/* Left: P&L Skeleton */}
            <div className="text-center md:text-left w-full md:w-auto space-y-4">
              <div className="flex items-center justify-center md:justify-start gap-3">
                <Skeleton className="w-12 h-12 md:w-16 md:h-16 rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>

              <Skeleton className="h-16 md:h-20 w-64 mx-auto md:mx-0" />

              <div className="flex items-center justify-center md:justify-start gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>

            {/* Right: Quick Stats Skeleton */}
            <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-slate-800/30 rounded-xl p-4 space-y-3">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-3 w-12" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Account Type Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-8 w-24" />
            </div>
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Chart Loading Skeleton
 * Generic skeleton for chart components
 */
export function ChartSkeleton({ height = 300, title }) {
  return (
    <div className="space-y-4">
      {title && <Skeleton className="h-6 w-48" />}
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6">
        <Skeleton className="w-full rounded-lg" style={{ height: `${height}px` }} />
      </div>
    </div>
  )
}

/**
 * Card Grid Skeleton
 * For behavioral insights, patterns, etc.
 */
export function CardGridSkeleton({ count = 4, columns = 2 }) {
  return (
    <div className={`grid grid-cols-1 ${columns === 2 ? 'md:grid-cols-2' : columns === 3 ? 'md:grid-cols-3' : ''} gap-6`}>
      {[...Array(count)].map((_, i) => (
        <div key={i} className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6 space-y-4">
          <div className="flex items-start gap-4">
            <Skeleton className="w-12 h-12 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-full" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
      ))}
    </div>
  )
}

/**
 * Table Skeleton
 * For symbol breakdowns, trade history, etc.
 */
export function TableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-700/50 p-4">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {[...Array(columns)].map((_, i) => (
            <Skeleton key={i} className="h-4 w-20" />
          ))}
        </div>
      </div>

      {/* Rows */}
      {[...Array(rows)].map((_, rowIdx) => (
        <div key={rowIdx} className="border-b border-slate-700/50 p-4 last:border-0">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {[...Array(columns)].map((_, colIdx) => (
              <Skeleton key={colIdx} className="h-4 w-full" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Metric Cards Skeleton
 * For overview stats, KPIs, etc.
 */
export function MetricCardsSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4 md:p-6 space-y-3">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  )
}

/**
 * Dashboard Stats Skeleton
 * Matches the 2-column stats grid
 */
export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Stats Card Skeleton */}
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4 space-y-3">
        <Skeleton className="h-3 w-32" />
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-12" />
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
      </div>

      {/* Recommendations Card Skeleton */}
      <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 space-y-3">
        <Skeleton className="h-3 w-20 bg-emerald-500/20" />
        <Skeleton className="h-12 w-full bg-emerald-500/10" />
        <Skeleton className="h-4 w-24 bg-emerald-500/20" />
      </div>
    </div>
  )
}

/**
 * Data Source Card Skeleton
 * Matches exchange/CSV card layout
 */
export function DataSourceSkeleton({ count = 2 }) {
  return (
    <div className="space-y-2">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              {/* Checkbox skeleton */}
              <Skeleton className="w-5 h-5 rounded" />
              {/* Icon skeleton */}
              <Skeleton className="w-10 h-10 rounded-lg" />
              {/* Content */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-16 rounded-lg" />
              <Skeleton className="h-7 w-7 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Uploaded Files Skeleton
 * Matches the uploaded file card layout in CSVUploadFlow
 */
export function UploadedFilesSkeleton({ count = 3 }) {
  return (
    <div className="space-y-2">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="w-4 h-4" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-5 w-20 rounded" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="w-7 h-7 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Full Page Loading
 * For initial page load
 */
export function FullPageSkeleton() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header Skeleton */}
      <div className="border-b border-slate-800/50 p-4 md:p-6">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Content */}
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8 space-y-8">
        <HeroSkeleton />

        <div className="space-y-6">
          <Skeleton className="h-12 w-48" />
          <CardGridSkeleton count={4} columns={2} />
        </div>
      </main>
    </div>
  )
}
