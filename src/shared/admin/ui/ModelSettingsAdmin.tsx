'use client'

/**
 * Admin panel for per-role model routing. Each slot renders a `ModelSettingRow`
 * (curated dropdown + free-text OpenRouter id + probe); this component owns the
 * load/save round-trip. Every model routes through the single OPENROUTER_API_KEY.
 */

import { useCallback, useEffect, useState } from 'react'
import type {
  ModelSettingRoleDef,
  OpenRouterModelOption,
} from '@/shared/agent-kernel/constants/model-settings'
import {
  MODEL_OPTION_UNSET,
  MODEL_SETTINGS_API_PATH,
  ModelSaveState,
  ModelSettingsCopy,
} from '@/shared/admin/constants/model-settings-admin'
import { ContentType, HttpMethod } from '@/shared/data/constants/protocol'
import { ModelSettingRow } from './ModelSettingRow'

const CONTENT_TYPE_HEADER = 'Content-Type'

interface AdminData {
  settings: Record<string, string>
  roles: ModelSettingRoleDef[]
  options: OpenRouterModelOption[]
}

export function ModelSettingsAdmin() {
  const [data, setData] = useState<AdminData | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [rowState, setRowState] = useState<Record<string, ModelSaveState>>({})

  const load = useCallback(async () => {
    try {
      const res = await fetch(MODEL_SETTINGS_API_PATH)
      if (!res.ok) {
        setLoadError(`Failed to load (${res.status})`)
        return
      }
      setData(await res.json())
    } catch {
      setLoadError(ModelSettingsCopy.LoadError)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const save = useCallback(async (role: string, model: string) => {
    const setRow = (state: ModelSaveState) => setRowState(prev => ({ ...prev, [role]: state }))
    setRow(ModelSaveState.Saving)
    try {
      const useDelete = model === MODEL_OPTION_UNSET
      const res = await fetch(MODEL_SETTINGS_API_PATH, {
        method: useDelete ? HttpMethod.Delete : HttpMethod.Put,
        headers: { [CONTENT_TYPE_HEADER]: ContentType.Json },
        body: JSON.stringify(useDelete ? { role } : { role, model }),
      })
      if (!res.ok) {
        setRow(ModelSaveState.Error)
        return
      }
      setData(prev => (prev ? { ...prev, settings: nextSettings(prev.settings, role, model) } : prev))
      setRow(ModelSaveState.Saved)
    } catch {
      setRow(ModelSaveState.Error)
    }
  }, [])

  const onSave = useCallback((role: string, model: string) => void save(role, model), [save])

  if (loadError) {
    return <p className="p-6 text-sm text-red-500">{loadError}</p>
  }
  if (!data) {
    return <p className="p-6 text-sm opacity-70">{ModelSettingsCopy.Loading}</p>
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-xl font-semibold">{ModelSettingsCopy.Title}</h1>
      <p className="mt-1 text-sm opacity-70">{ModelSettingsCopy.Subtitle}</p>

      <div className="mt-6 space-y-3">
        {data.roles.map(roleDef => (
          <ModelSettingRow
            key={roleDef.role}
            roleDef={roleDef}
            options={data.options}
            current={data.settings[roleDef.role] ?? MODEL_OPTION_UNSET}
            saveState={rowState[roleDef.role] ?? ModelSaveState.Idle}
            onSave={onSave}
          />
        ))}
      </div>
    </div>
  )
}

function nextSettings(
  settings: Record<string, string>,
  role: string,
  model: string
): Record<string, string> {
  const next = { ...settings }
  if (model === MODEL_OPTION_UNSET) Reflect.deleteProperty(next, role)
  else next[role] = model
  return next
}
