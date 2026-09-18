'use client'

import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { ContentType, HttpMethod } from '@/shared/data/constants/protocol'
import { fetchJsonRecord } from '@/shared/data/fetch-json-record'
import { joinUrlPath } from '@/shared/data/url-builder'
import { useWorkspaceProjectStore } from '@/shared/workspace/workspace-project-store'
import type { WorkspaceProject } from '@/shared/workspace/types'
import { StyleRefsCopy } from './constants'
import {
  clampStyleReferenceUrls,
  remainingStyleRefSlots,
  takeStyleRefFiles,
} from './style-ref-files'
import {
  StyleRefOwner,
  styleRefPatchKey,
  styleRefUrlsFromProject,
  styleRefUrlsFromRecord,
} from './style-ref-owner'
import { uploadStyleRefFile } from './style-refs.api'

function nextProjectWithStyleRefs(
  latest: WorkspaceProject,
  owner: StyleRefOwner,
  urls: string[],
): WorkspaceProject {
  if (owner === StyleRefOwner.Storyteller) {
    return { ...latest, storytellerStyleReferenceUrls: urls }
  }
  return { ...latest, styleReferenceUrls: urls }
}

export function useProjectStyleRefs(
  currentProject: WorkspaceProject | null,
  owner: StyleRefOwner,
) {
  const [styleReferenceUrls, setStyleReferenceUrls] = useState<string[]>([])
  const [isUploadingStyleRefs, setIsUploadingStyleRefs] = useState(false)
  const projectRef = useRef(currentProject)

  useEffect(() => {
    projectRef.current = currentProject
  }, [currentProject])

  useEffect(() => {
    const project = projectRef.current
    if (!project?.id) {
      setStyleReferenceUrls([])
      return
    }
    setStyleReferenceUrls(styleRefUrlsFromProject(project, owner))
    void (async () => {
      try {
        const data = await fetchJsonRecord(joinUrlPath('/api/storyteller/projects', project.id))
        setStyleReferenceUrls(styleRefUrlsFromRecord(data, owner))
      } catch (err) {
        console.error(StyleRefsCopy.FailedToLoad, err)
      }
    })()
  }, [currentProject?.id, owner])

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
          [styleRefPatchKey(owner)]: next,
        }),
      })
      const latest = useWorkspaceProjectStore.getState().currentProject
      if (!latest || latest.id !== project.id) return
      useWorkspaceProjectStore.getState().setCurrentProject(
        nextProjectWithStyleRefs(latest, owner, next),
      )
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
