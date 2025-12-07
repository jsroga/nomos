'use client'

import { useProjectFromUrl } from '@/hooks/useProjectFromUrl'
import { Loader2 } from 'lucide-react'

export function ProjectLoader({ children }: { children: React.ReactNode }) {
    const { isLoading, error, hasProject } = useProjectFromUrl()

    if (isLoading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Loading project...</span>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex h-full w-full items-center justify-center flex-col gap-4">
                <p className="text-destructive font-medium">{error}</p>
                <p className="text-muted-foreground">The project you are trying to access does not exist or you don't have permission.</p>
            </div>
        )
    }

    if (!hasProject) {
        // Should ideally not happen inside [projectId] unless params are missing
        return null
    }

    return <>{children}</>
}
