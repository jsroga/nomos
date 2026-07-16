'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  listProjectAssets,
  type WorkspaceAsset,
} from '@/shared/workspace/io/project-assets-api'

export function useProjectAssets(projectId: string | undefined) {
  const [assets, setAssets] = useState<WorkspaceAsset[]>([])
  const [loading, setLoading] = useState(false)

  const refetch = useCallback(async () => {
    if (!projectId) {
      setAssets([])
      return
    }
    setLoading(true)
    try {
      const nextAssets = await listProjectAssets(projectId)
      setAssets(nextAssets)
    } catch (error) {
      console.error('Failed to load project assets:', error)
      setAssets([])
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { assets, loading, refetch }
}
