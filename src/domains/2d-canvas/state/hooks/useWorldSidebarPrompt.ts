import { useEffect, useRef, useState } from 'react'
import {
  type GenerationMode,
  type GenerationModeDef,
  resolveGenerationMode,
} from '../../constants/generation-modes'
import { settingsApi } from '../../core/io/settings.api'
import { MASTER_PROMPT_SAVE_DEBOUNCE_MS, WorldGenSidebarLog } from '../../ui/constants/sidebar'
import { useWorkspaceProjectStore } from '@/shared/workspace/workspace-project-store'
import type { WorkspaceProject } from '@/shared/workspace/types'

export function masterPromptAfterModePick(current: string, hint: string): string {
  return current.trim() === '' ? hint : current
}

export function useWorldSidebarPrompt(currentProject: WorkspaceProject | null) {
  const [masterPrompt, setMasterPrompt] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const projectRef = useRef(currentProject)

  useEffect(() => {
    projectRef.current = currentProject
  }, [currentProject])

  useEffect(() => {
    setMasterPrompt(currentProject?.master_prompt ?? '')
  }, [currentProject?.id, currentProject?.master_prompt])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const persistProjectFields = async (fields: {
    masterPrompt?: string
    generationMode?: string
  }) => {
    const project = projectRef.current
    if (!project) return
    try {
      await settingsApi.patchProjectStyle(project.id, fields)
      const latest = useWorkspaceProjectStore.getState().currentProject
      if (!latest || latest.id !== project.id) return
      useWorkspaceProjectStore.getState().setCurrentProject({
        ...latest,
        ...(fields.masterPrompt !== undefined ? { master_prompt: fields.masterPrompt } : {}),
        ...(fields.generationMode !== undefined ? { generationMode: fields.generationMode } : {}),
      })
    } catch (error) {
      console.error(WorldGenSidebarLog.FailedToSaveWorldSettings, error)
    }
  }

  const handleMasterPromptChange = (value: string) => {
    setMasterPrompt(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      void persistProjectFields({ masterPrompt: value })
    }, MASTER_PROMPT_SAVE_DEBOUNCE_MS)
  }

  const handleSelectGenerationMode = (mode: GenerationModeDef) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const nextPrompt = masterPromptAfterModePick(masterPrompt, mode.hint)
    setMasterPrompt(nextPrompt)
    const fields: { masterPrompt?: string; generationMode: GenerationMode } = {
      generationMode: mode.id,
    }
    if (nextPrompt !== (projectRef.current?.master_prompt ?? '')) {
      fields.masterPrompt = nextPrompt
    }
    void persistProjectFields(fields)
  }

  return {
    masterPrompt,
    handleMasterPromptChange,
    handleSelectGenerationMode,
    generationMode: resolveGenerationMode(currentProject?.generationMode),
  }
}
