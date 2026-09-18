'use client'

import { useProjectFromUrl } from '@/components/shell/useProjectFromUrl'
import { Loader2 } from 'lucide-react'
import {
  ProjectLoaderClass,
  ProjectLoaderMessage,
} from '@/shared/data/constants/project-loader'

export function ProjectLoader({ children }: { children: React.ReactNode }) {
  const { isReady, error, hasProject, projectId } = useProjectFromUrl()

  if (error) {
    const hint =
      error === ProjectLoaderMessage.FailedLoadProject
        ? ProjectLoaderMessage.FailedLoadHint
        : ProjectLoaderMessage.NotFoundHint
    return (
      <div className="flex h-full w-full items-center justify-center flex-col gap-4">
        <p className="text-destructive font-medium">{error}</p>
        <p className="text-muted-foreground">{hint}</p>
      </div>
    )
  }

  if (!hasProject) {
    return null
  }

  if (!isReady) {
    return (
      <div className={ProjectLoaderClass.Root}>
        <div className={ProjectLoaderClass.Overlay}>
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading project...</span>
        </div>
      </div>
    )
  }

  return (
    <div key={projectId ?? ''} className={ProjectLoaderClass.Root}>
      <div className={ProjectLoaderClass.Children}>{children}</div>
    </div>
  )
}
