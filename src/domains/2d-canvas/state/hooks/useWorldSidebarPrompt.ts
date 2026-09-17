import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import {
  GenerationMode,
  type GenerationModeDef,
  resolveGenerationMode,
} from '../../utils/generation-modes'
import {
  clampStyleReferenceUrls,
  generationModePersistFields,
  remainingStyleRefSlots,
  takeStyleRefFiles,
} from '../../utils/mj-sref'
import { settingsApi } from '../../core/io/settings.api'
import { uploadStyleRefFile } from '../../core/io/style-refs.api'
import { useMasterPromptAutosave } from '@/components/MasterPromptField'
import {
  WorldGenSidebarLog,
  WorldGenSidebarToast,
} from '../../ui/utils/sidebar'
import { useWorkspaceProjectStore } from '@/shared/workspace/workspace-project-store'
import type { WorkspaceProject } from '@/shared/workspace/types'
import { resolveGenerationModeSrefUrls } from './apply-generation-mode-srefs'

export function masterPromptAfterModePick(_current: string, promptFragment: string): string {
  return promptFragment
}

type PersistableWorldFields = {
  canvasMasterPrompt?: string
  generationMode?: string
  styleAnchorUrl?: string | null
  styleReferenceUrls?: string[]
  stylePreset?: string | null
}

export function useWorldSidebarPrompt(
  currentProject: WorkspaceProject | null,
  resolveCatalogSrefUrls?: (modeId: GenerationMode) => readonly string[] | undefined,
) {
  const [styleReferenceUrls, setStyleReferenceUrls] = useState<string[]>([])
  const [isUploadingStyleRefs, setIsUploadingStyleRefs] = useState(false)
  const [isApplyingGenerationMode, setIsApplyingGenerationMode] = useState(false)
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
        const data = await settingsApi.fetchProject(currentProject.id)
        setStyleReferenceUrls(clampStyleReferenceUrls(data.styleReferenceUrls ?? []))
      } catch (err) {
        console.error(WorldGenSidebarLog.FailedToLoadProjectStyleRefs, err)
      }
    })()
  }, [currentProject?.id])

  const persistProjectFields = async (fields: PersistableWorldFields) => {
    const project = projectRef.current
    if (!project) return
    try {
      await settingsApi.patchProjectStyle(project.id, fields)
      const latest = useWorkspaceProjectStore.getState().currentProject
      if (!latest || latest.id !== project.id) return
      useWorkspaceProjectStore.getState().setCurrentProject({
        ...latest,
        ...(fields.canvasMasterPrompt !== undefined
          ? { canvasMasterPrompt: fields.canvasMasterPrompt }
          : {}),
        ...(fields.generationMode !== undefined ? { generationMode: fields.generationMode } : {}),
        ...(fields.styleAnchorUrl !== undefined ? { styleAnchorUrl: fields.styleAnchorUrl } : {}),
        ...(fields.stylePreset !== undefined ? { stylePreset: fields.stylePreset } : {}),
        ...(fields.styleReferenceUrls !== undefined
          ? { styleReferenceUrls: fields.styleReferenceUrls }
          : {}),
      })
    } catch (error) {
      console.error(WorldGenSidebarLog.FailedToSaveWorldSettings, error)
    }
  }

  const { prompt: masterPrompt, handleChange: handleMasterPromptChange, persistNow } =
    useMasterPromptAutosave(
      currentProject?.canvasMasterPrompt ?? '',
      currentProject?.id ?? '',
      value => {
        void persistProjectFields({ canvasMasterPrompt: value })
      },
    )

  const persistStyleUrls = async (urls: string[]) => {
    const next = clampStyleReferenceUrls(urls)
    setStyleReferenceUrls(next)
    await persistProjectFields({ styleReferenceUrls: next, stylePreset: null })
  }

  const handleSelectGenerationMode = async (mode: GenerationModeDef) => {
    const project = projectRef.current
    if (!project) return
    setIsApplyingGenerationMode(true)
    try {
      const urls = resolveGenerationModeSrefUrls(mode, resolveCatalogSrefUrls?.(mode.id))
      const fields = generationModePersistFields({ mode, styleReferenceUrls: urls })
      persistNow(fields.canvasMasterPrompt)
      setStyleReferenceUrls(fields.styleReferenceUrls)
      await persistProjectFields(fields)
    } catch (error) {
      console.error(WorldGenSidebarLog.FailedToUploadStyleRefs, error)
      toast.error(WorldGenSidebarToast.StyleRefUploadFailed)
    } finally {
      setIsApplyingGenerationMode(false)
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
      console.error(WorldGenSidebarLog.FailedToUploadStyleRefs, error)
      toast.error(WorldGenSidebarToast.StyleRefUploadFailed)
    } finally {
      setIsUploadingStyleRefs(false)
    }
  }

  const handleRemoveStyleRef = (index: number) => {
    void persistStyleUrls(styleReferenceUrls.filter((_, i) => i !== index))
  }

  const handleClearStyleRefs = () => {
    void persistStyleUrls([])
    toast.success(WorldGenSidebarToast.StyleRefsCleared)
  }

  const handleRestoreStyleRefs = (urls: string[]) => {
    void persistStyleUrls(urls)
  }

  const handleResetStyleAnchor = () => {
    void persistProjectFields({ styleAnchorUrl: null })
  }

  return {
    masterPrompt,
    handleMasterPromptChange,
    handleSelectGenerationMode,
    handleResetStyleAnchor,
    handleAddStyleRefFiles,
    handleRemoveStyleRef,
    handleClearStyleRefs,
    handleRestoreStyleRefs,
    styleReferenceUrls,
    isUploadingStyleRefs,
    isApplyingGenerationMode,
    generationMode: resolveGenerationMode(currentProject?.generationMode),
    styleAnchorUrl: currentProject?.styleAnchorUrl ?? null,
  }
}
