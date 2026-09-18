'use client'

import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { ContentType, HttpMethod } from '@/shared/data/constants/protocol'
import { DB_COLUMN } from '@/shared/data/constants/db-tables'
import { fetchJsonRecord } from '@/shared/data/fetch-json-record'
import { stringArrayFromJson } from '@/shared/data/json-guards'
import { joinUrlPath } from '@/shared/data/url-builder'
import { useWorkspaceProjectStore } from '@/shared/workspace/workspace-project-store'
import type { WorkspaceProject } from '@/shared/workspace/types'
import { StyleRefsCopy } from './constants'
import {
  clampStyleReferenceUrls,
  remainingStyleRefSlots,
  StyleRefProjectPatch,
  takeStyleRefFiles,
} from './style-ref-files'
import { uploadStyleRefFile } from './style-refs.api'

export function useProjectStyleRefs(currentProject: WorkspaceProject | null) {
  const [styleReferenceUrls, setStyleReferenceUrls] = useState<string[]>([])
  const [isUploadingStyleRefs, setIsUploadingStyleRefs] = useState(false)
  const projectRef = useRef(currentProject)

  useEffect(() => {
    projectRef.current = currentProject
  }, [currentProject])

  useEffect(() => {
    if (!currentProject?.id) {
      setStyleReferenceUrls([])
      return
    }
    setStyleReferenceUrls(clampStyleReferenceUrls(currentProject.styleReferenceUrls ?? []))
    void (async () => {
      try {
        const data = await fetchJsonRecord(joinUrlPath('/api/storyteller/projects', currentProject.id))
        const next = clampStyleReferenceUrls(
          stringArrayFromJson(data.styleReferenceUrls ?? data[DB_COLUMN.STYLE_REFERENCE_URLS]),
        )
        setStyleReferenceUrls(next)
      } catch (err) {
        console.error(StyleRefsCopy.FailedToLoad, err)
      }
    })()
  }, [currentProject?.id])

  const persistStyleUrls = async (urls: string[]) => {
    const project = projectRef.current
    if (!project) return
    const next = clampStyleReferenceUrls(urls)
    setStyleReferenceUrls(next)
    try {
      await fetchJsonRecord(joinUrlPath('/api/storyteller/projects', project.id), {
        method: HttpMethod.Patch,
        headers: { 'Content-Type': ContentType.Json },
        body: JSON.stringify({
          [StyleRefProjectPatch.StyleReferenceUrls]: next,
          [StyleRefProjectPatch.StylePreset]: null,
        }),
      })
      const latest = useWorkspaceProjectStore.getState().currentProject
      if (!latest || latest.id !== project.id) return
      useWorkspaceProjectStore.getState().setCurrentProject({
        ...latest,
        styleReferenceUrls: next,
        [StyleRefProjectPatch.StylePreset]: null,
      })
    } catch (error) {
      console.error(StyleRefsCopy.FailedToSave, error)
    }
  }

  const handleAddStyleRefFiles = async (files: Iterable<File>) => {
    const project = projectRef.current
    if (!project) return
    const accepted = takeStyleRefFiles(files, remainingStyleRefSlots(styleReferenceUrls.length))
    if (accepted.length === 0) return
    setIsUploadingStyleRefs(true)
    try {
      const uploaded: string[] = []
      for (const file of accepted) {
        uploaded.push(await uploadStyleRefFile({ projectId: project.id, file }))
      }
      await persistStyleUrls([...styleReferenceUrls, ...uploaded])
    } catch (error) {
      console.error(StyleRefsCopy.FailedToUpload, error)
      toast.error(StyleRefsCopy.StyleRefUploadFailed)
    } finally {
      setIsUploadingStyleRefs(false)
    }
  }

  const handleRemoveStyleRef = (index: number) => {
    void persistStyleUrls(styleReferenceUrls.filter((_, i) => i !== index))
  }

  const handleRestoreStyleRefs = (urls: string[]) => {
    void persistStyleUrls(urls)
  }

  const replaceStyleReferenceUrls = (urls: string[]) => {
    void persistStyleUrls(urls)
  }

  return {
    styleReferenceUrls,
    isUploadingStyleRefs,
    handleAddStyleRefFiles,
    handleRemoveStyleRef,
    handleRestoreStyleRefs,
    replaceStyleReferenceUrls,
  }
}
