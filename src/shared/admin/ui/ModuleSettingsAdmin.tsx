'use client'

/**
 * Admin panel for canvas modules (Track A2). Lists each module with an enable
 * toggle, a per-module model slot, and a canvas placement; saves to Supabase via
 * the admin API. Overrides the CANVAS_MODULES catalog defaults.
 */

import { useCallback, useEffect, useState } from 'react'

const API_PATH = '/api/admin/modules'
const METHOD_PUT = 'PUT'
const CONTENT_TYPE_JSON = 'application/json'
const UNSET_VALUE = ''
const LOAD_ERROR_MESSAGE = 'Failed to load module settings.'
const SLOT_PLACEHOLDER = 'canvas slot'
const INHERIT_LABEL = '— inherit default —'

interface ModuleRow {
  key: string
  label: string
  description: string
  enabled: boolean
  canvasSlot: string | null
  modelRole: string
}

interface RoleOption {
  role: string
  label: string
}

interface AdminData {
  modules: ModuleRow[]
  modelRoleOptions: RoleOption[]
}

enum SaveState {
  Idle = 'idle',
  Saving = 'saving',
  Saved = 'saved',
  Error = 'error',
}

export function ModuleSettingsAdmin() {
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

  const save = useCallback(
    async (moduleKey: string, patch: Partial<ModuleRow>) => {
      setRowState(prev => ({ ...prev, [moduleKey]: SaveState.Saving }))
      setData(prev => (prev ? { ...prev, modules: applyPatch(prev.modules, moduleKey, patch) } : prev))
      try {
        const res = await fetch(API_PATH, {
          method: METHOD_PUT,
          headers: { 'Content-Type': CONTENT_TYPE_JSON },
          body: JSON.stringify({ moduleKey, ...patch }),
        })
        setRowState(prev => ({
          ...prev,
          [moduleKey]: res.ok ? SaveState.Saved : SaveState.Error,
        }))
      } catch {
        setRowState(prev => ({ ...prev, [moduleKey]: SaveState.Error }))
      }
    },
    []
  )

  if (loadError) return <p className="p-6 text-sm text-red-500">{loadError}</p>
  if (!data) return <p className="p-6 text-sm opacity-70">Loading module settings…</p>

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-xl font-semibold">Modules</h1>
      <p className="mt-1 text-sm opacity-70">
        Enable canvas modules, pick their model slot, and set canvas placement.
      </p>

      <div className="mt-6 space-y-3">
        {data.modules.map(module => (
          <ModuleCard
            key={module.key}
            module={module}
            options={data.modelRoleOptions}
            state={rowState[module.key] ?? SaveState.Idle}
            onSave={save}
          />
        ))}
      </div>
    </div>
  )
}

interface ModuleCardProps {
  module: ModuleRow
  options: RoleOption[]
  state: SaveState
  onSave: (moduleKey: string, patch: Partial<ModuleRow>) => void
}

function ModuleCard({ module, options, state, onSave }: ModuleCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-black/10 p-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="font-medium">{module.label}</div>
        <div className="text-xs opacity-60">{module.description}</div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1 text-sm">
          <input
            type="checkbox"
            checked={module.enabled}
            onChange={e => onSave(module.key, { enabled: e.target.checked })}
          />
          enabled
        </label>
        <select
          className="rounded-md border border-black/15 bg-transparent px-2 py-1 text-sm dark:border-white/15"
          value={module.modelRole}
          onChange={e => onSave(module.key, { modelRole: e.target.value })}
          aria-label={`${module.label} model slot`}
        >
          <option value={UNSET_VALUE}>{INHERIT_LABEL}</option>
          {options.map(opt => (
            <option key={opt.role} value={opt.role}>
              {opt.label}
            </option>
          ))}
        </select>
        <input
          className="w-28 rounded-md border border-black/15 bg-transparent px-2 py-1 text-sm dark:border-white/15"
          placeholder={SLOT_PLACEHOLDER}
          defaultValue={module.canvasSlot ?? UNSET_VALUE}
          onBlur={e => onSave(module.key, { canvasSlot: e.target.value })}
          aria-label={`${module.label} canvas slot`}
        />
        <SaveBadge state={state} />
      </div>
    </div>
  )
}

function applyPatch(
  modules: ModuleRow[],
  moduleKey: string,
  patch: Partial<ModuleRow>
): ModuleRow[] {
  return modules.map(m => (m.key === moduleKey ? { ...m, ...patch } : m))
}

function SaveBadge({ state }: { state: SaveState }) {
  if (state === SaveState.Saving) return <span className="text-xs opacity-60">saving…</span>
  if (state === SaveState.Saved) return <span className="text-xs text-green-600">saved ✓</span>
  if (state === SaveState.Error) return <span className="text-xs text-red-500">error</span>
  return <span className="w-8" />
}
