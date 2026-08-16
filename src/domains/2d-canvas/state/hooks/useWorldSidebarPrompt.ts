import { useEffect, useRef, useState } from 'react'
import {
  type GenerationModeDef,
  resolveGenerationMode,
} from '../../constants/generation-modes'
import { settingsApi } from '../../core/io/settings.api'
import { MASTER_PROMPT_SAVE_DEBOUNCE_MS, WorldGenSidebarLog } from '../../ui/constants/sidebar'
import { useWorkspaceProjectStore } from '@/shared/workspace/workspace-project-store'
import type { WorkspaceProject } from '@/shared/workspace/types'

export function masterPromptAfterModePick(_current: string, promptFragment: string): string {
  return promptFragment
}

type PersistableWorldFields = {
  canvasMasterPrompt?: string
  generationMode?: string
  styleAnchorUrl?: string | null
}

export function useWorldSidebarPrompt(currentProject: WorkspaceProject | null) {
  const [masterPrompt, setMasterPrompt] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const projectRef = useRef(currentProject)

  useEffect(() => {
    projectRef.current = currentProject
  }, [currentProject])

  useEffect(() => {
    setMasterPrompt(currentProject?.canvasMasterPrompt ?? '')
  }, [currentProject?.id, currentProject?.canvasMasterPrompt])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

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
      })
    } catch (error) {
      console.error(WorldGenSidebarLog.FailedToSaveWorldSettings, error)
    }
  }

  const handleMasterPromptChange = (value: string) => {
    setMasterPrompt(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      void persistProjectFields({ canvasMasterPrompt: value })
    }, MASTER_PROMPT_SAVE_DEBOUNCE_MS)
  }

  const handleSelectGenerationMode = (mode: GenerationModeDef) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const nextPrompt = masterPromptAfterModePick(masterPrompt, mode.promptFragment)
    setMasterPrompt(nextPrompt)
    void persistProjectFields({
      generationMode: mode.id,
      canvasMasterPrompt: nextPrompt,
    })
  }

  const handleResetStyleAnchor = () => {
    void persistProjectFields({ styleAnchorUrl: null })
  }

  return {
    masterPrompt,
    handleMasterPromptChange,
    handleSelectGenerationMode,
    handleResetStyleAnchor,
    generationMode: resolveGenerationMode(currentProject?.generationMode),
    styleAnchorUrl: currentProject?.styleAnchorUrl ?? null,
  }
}
