import { memo } from 'react'

/**
 * Base primitive Skeleton component with pulsing shimmer effect.
 */
export const Skeleton = memo(({ className = '', style, ...props }) => {
  return (
    <div
      className={`animate-pulse rounded-md bg-surface-container-high/60 ${className}`}
      style={style}
      aria-hidden="true"
      {...props}
    />
  )
})

Skeleton.displayName = 'Skeleton'

/**
 * Skeleton placeholder for Subjects Overview Page.
 */
export const SubjectsSkeleton = () => {
  return (
    <div className="w-full flex flex-col gap-8 font-inter pb-16">
      {/* Page Header Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 rounded-xl" />
          <Skeleton className="h-4 w-72 rounded-md" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-36 rounded-lg" />
          <Skeleton className="h-10 w-36 rounded-lg" />
        </div>
      </div>

      {/* Grid of Subject Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-6 space-y-4 shadow-sm"
          >
            {/* Top row: Icon + Code */}
            <div className="flex justify-between items-center">
              <Skeleton className="size-11 rounded-xl" />
              <Skeleton className="h-6 w-16 rounded-md" />
            </div>

            {/* Title & Teacher */}
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-24 rounded" />
              <Skeleton className="h-6 w-3/4 rounded" />
              <Skeleton className="h-3.5 w-32 rounded" />
            </div>

            {/* Progress */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-20 rounded" />
                <Skeleton className="h-3 w-16 rounded" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center pt-2 border-t border-outline-variant/40">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-4 w-14 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Skeleton placeholder for Dashboard Page.
 */
export const DashboardSkeleton = ({ statusBanner = null }) => {
  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-3 font-inter">
      {statusBanner ? (
        <div className="col-span-full">
          {statusBanner}
        </div>
      ) : null}

      {/* Left 2 Columns (2/3) */}
      <div className="contents lg:flex lg:flex-col lg:gap-6 lg:col-span-2 space-y-6 lg:space-y-0">
        {/* Greeting Banner */}
        <div className="space-y-2">
          <Skeleton className="h-9 w-72 rounded-xl" />
          <Skeleton className="h-4 w-48 rounded-md" />
        </div>

        {/* Needs Attention / NextUp Card Skeletons */}
        <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-44 rounded-md" />
            <Skeleton className="h-6 w-8 rounded-full" />
          </div>
          <div className="space-y-3 pt-2">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        </div>

        <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-36 rounded-md" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>

        {/* My Subjects 2x2 Grid Skeleton */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-6 w-36 rounded-md" />
            <Skeleton className="h-4 w-20 rounded" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-4 space-y-3 shadow-sm"
              >
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-16 rounded" />
                  <Skeleton className="h-4 w-10 rounded" />
                </div>
                <Skeleton className="h-5 w-3/4 rounded" />
                <Skeleton className="h-3 w-1/2 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column (1/3) */}
      <div className="contents lg:flex lg:flex-col lg:gap-6 lg:col-span-1 space-y-6 lg:space-y-0">
        {/* Today Schedule Skeleton */}
        <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32 rounded-md" />
            <Skeleton className="h-4 w-16 rounded" />
          </div>
          <div className="space-y-3 pt-2">
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
        </div>

        {/* Quick Progress Skeleton */}
        <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-6 space-y-4 shadow-sm">
          <Skeleton className="h-6 w-36 rounded-md" />
          <div className="space-y-2 pt-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-4 w-16 rounded" />
            </div>
            <Skeleton className="h-4 w-full rounded-full" />
          </div>
          <div className="grid grid-cols-2 gap-3 pt-3">
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Skeleton placeholder for Calendar Page.
 */
export const CalendarSkeleton = () => {
  return (
    <div className="flex flex-1 flex-col overflow-hidden min-w-0 font-inter space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-outline-variant/60 pb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-7 w-44 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Skeleton className="h-7 w-20 rounded-full" />
        <Skeleton className="h-7 w-24 rounded-full" />
        <Skeleton className="h-7 w-20 rounded-full" />
        <Skeleton className="h-7 w-28 rounded-full" />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-2 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-4 min-h-[480px]">
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} className="min-h-[70px] rounded-xl" />
        ))}
      </div>
    </div>
  )
}

/**
 * Skeleton placeholder for Materials Page.
 */
export const MaterialsSkeleton = () => {
  return (
    <div className="w-full flex flex-col gap-8 font-inter pb-16">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56 rounded-xl" />
          <Skeleton className="h-4 w-72 rounded-md" />
        </div>
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-outline-variant/60 bg-surface p-3 sm:flex-row sm:items-center">
        <Skeleton className="h-10 flex-1 rounded-xl" />
        <Skeleton className="h-10 w-44 rounded-xl" />
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>

      {/* Two columns layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 space-y-3 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-40 rounded" />
                <Skeleton className="h-4 w-20 rounded" />
              </div>
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 space-y-4 shadow-sm">
          <Skeleton className="h-6 w-32 rounded-md" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}

/**
 * Skeleton placeholder for Subject Detail Page.
 */
export const SubjectDetailSkeleton = () => {
  return (
    <div className="w-full flex flex-col gap-6 font-inter pb-16">
      {/* Top Banner / Header Card */}
      <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-6 space-y-4 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-8 w-64 rounded-xl" />
            <Skeleton className="h-4 w-40 rounded" />
          </div>
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      </div>

      {/* Metric Strip (3-4 cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-4 space-y-3 shadow-sm"
          >
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-7 w-20 rounded" />
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>

      {/* Tabs bar */}
      <div className="flex items-center gap-4 border-b border-outline-variant/60 pb-2">
        <Skeleton className="h-8 w-28 rounded-lg" />
        <Skeleton className="h-8 w-28 rounded-lg" />
        <Skeleton className="h-8 w-28 rounded-lg" />
      </div>

      {/* Main Tab Content */}
      <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-6 space-y-4 shadow-sm min-h-[300px]">
        <Skeleton className="h-6 w-48 rounded" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    </div>
  )
}

/**
 * Skeleton placeholder for Profile Page.
 */
export const ProfileSkeleton = () => {
  return (
    <div className="w-full space-y-8 font-inter pb-12">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-40 rounded-xl" />
        <Skeleton className="h-4 w-64 rounded-md" />
      </div>

      {/* 2-Column Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
        {/* Left Column (5/12) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Identity Card Skeleton */}
          <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-6 space-y-6 shadow-sm">
            <div className="flex items-start gap-4">
              <Skeleton className="w-20 h-20 rounded-2xl shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <Skeleton className="h-6 w-36 rounded-md" />
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-4 w-40 rounded" />
              </div>
            </div>
            <div className="space-y-3 pt-2 border-t border-outline-variant/40">
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          </div>

          {/* Study Summary Card Skeleton */}
          <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-6 space-y-4 shadow-sm">
            <Skeleton className="h-6 w-36 rounded-md" />
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
            </div>
          </div>

          {/* Progress Card Skeleton */}
          <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-6 space-y-4 shadow-sm">
            <Skeleton className="h-6 w-36 rounded-md" />
            <Skeleton className="h-3 w-full rounded-full" />
            <Skeleton className="h-4 w-28 rounded" />
          </div>
        </div>

        {/* Right Column (7/12) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Tabs bar */}
          <div className="flex items-center gap-3 border-b border-outline-variant/60 pb-3">
            <Skeleton className="h-9 w-24 rounded-xl" />
            <Skeleton className="h-9 w-24 rounded-xl" />
            <Skeleton className="h-9 w-24 rounded-xl" />
            <Skeleton className="h-9 w-24 rounded-xl" />
          </div>

          {/* Tab Panels */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-6 space-y-4 shadow-sm">
              <Skeleton className="h-6 w-44 rounded-md" />
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
            </div>
            <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-6 space-y-4 shadow-sm">
              <Skeleton className="h-6 w-44 rounded-md" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Skeleton
