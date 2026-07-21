'use client'

/**
 * Admin panel for per-role model routing. Lists each model slot with a dropdown
 * of OpenRouter models; saves to Supabase via the admin API. Every model routes
 * through the single OPENROUTER_API_KEY.
 */

import { useCallback, useEffect, useState } from 'react'
import type {
  ModelSettingRoleDef,
  OpenRouterModelOption,
} from '@/shared/agent-kernel/constants/model-settings'

const API_PATH = '/api/admin/model-settings'
const METHOD_PUT = 'PUT'
const METHOD_DELETE = 'DELETE'
const CONTENT_TYPE_JSON = 'application/json'
const UNSET_VALUE = ''
const AUTO_HINT = 'Leave unset to inherit the Default slot (or openrouter/auto-beta).'
const LOAD_ERROR_MESSAGE = 'Failed to load model settings.'

interface AdminData {
  settings: Record<string, string>
  roles: ModelSettingRoleDef[]
  options: OpenRouterModelOption[]
}

enum SaveState {
  Idle = 'idle',
  Saving = 'saving',
  Saved = 'saved',
  Error = 'error',
}

export function ModelSettingsAdmin() {
  const [data, setData] = useState<AdminData | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [rowState, setRowState] = useState<Record<string, SaveState>>({})

  const load = useCallback(async () => {
    try {
      const res = await fetch(API_PATH)
      if (!res.ok) {
        setLoadError(`Failed to load (${res.status})`)
        return
      }
      setData(await res.json())
    } catch {
      setLoadError(LOAD_ERROR_MESSAGE)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const setRow = (role: string, state: SaveState) =>
    setRowState(prev => ({ ...prev, [role]: state }))

  const onChange = useCallback(
    async (role: string, model: string) => {
      setRow(role, SaveState.Saving)
      try {
        const useDelete = model === UNSET_VALUE
        const res = await fetch(API_PATH, {
          method: useDelete ? METHOD_DELETE : METHOD_PUT,
          headers: { 'Content-Type': CONTENT_TYPE_JSON },
          body: JSON.stringify(useDelete ? { role } : { role, model }),
        })
        if (!res.ok) {
          setRow(role, SaveState.Error)
          return
        }
        setData(prev =>
          prev
            ? {
                ...prev,
                settings: nextSettings(prev.settings, role, model),
              }
            : prev
        )
        setRow(role, SaveState.Saved)
      } catch {
        setRow(role, SaveState.Error)
      }
    },
    []
  )

  if (loadError) {
    return <p className="p-6 text-sm text-red-500">{loadError}</p>
  }
  if (!data) {
    return <p className="p-6 text-sm opacity-70">Loading model settings…</p>
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-xl font-semibold">Model settings</h1>
      <p className="mt-1 text-sm opacity-70">
        Pick which model each agent uses. Everything runs on a single OpenRouter key.
      </p>

      <div className="mt-6 space-y-3">
        {data.roles.map(roleDef => {
          const current = data.settings[roleDef.role] ?? UNSET_VALUE
          const state = rowState[roleDef.role] ?? SaveState.Idle
          return (
            <div
              key={roleDef.role}
              className="flex flex-col gap-1 rounded-lg border border-black/10 p-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="font-medium">{roleDef.label}</div>
                <div className="text-xs opacity-60">{roleDef.description}</div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="rounded-md border border-black/15 bg-transparent px-2 py-1 text-sm dark:border-white/15"
                  value={current}
                  onChange={e => void onChange(roleDef.role, e.target.value)}
                  aria-label={roleDef.label}
                >
                  <option value={UNSET_VALUE} title={AUTO_HINT}>
                    — inherit default —
                  </option>
                  {data.options.map(opt => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <SaveBadge state={state} />
              </div>
            </div>
          )
        })}
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
  if (model === UNSET_VALUE) Reflect.deleteProperty(next, role)
  else next[role] = model
  return next
}

function SaveBadge({ state }: { state: SaveState }) {
  if (state === SaveState.Saving) return <span className="text-xs opacity-60">saving…</span>
  if (state === SaveState.Saved) return <span className="text-xs text-green-600">saved ✓</span>
  if (state === SaveState.Error) return <span className="text-xs text-red-500">error</span>
  return <span className="w-12" />
}
