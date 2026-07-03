'use client'

import { useProjectFromUrl } from '@/shared/data/useProjectFromUrl'
import { Loader2 } from 'lucide-react'

export function ProjectLoader({ children }: { children: React.ReactNode }) {
  const { isLoading, error, hasProject } = useProjectFromUrl()

  // Error state - show error instead of children
  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center flex-col gap-4">
        <p className="text-destructive font-medium">{error}</p>
        <p className="text-muted-foreground">
          The project you are trying to access does not exist or you don't have permission.
        </p>
      </div>
    )
  }

  // No project in URL - shouldn't happen in [projectId] routes
  if (!hasProject) {
    return null
  }

  // IMPORTANT: Always render children to preserve their state!
  // Show loading overlay instead of unmounting children
  return (
    <div className="relative h-full w-full">
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading project...</span>
        </div>
      )}
    </div>
  )
}
