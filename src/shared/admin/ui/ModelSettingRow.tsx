'use client'

/**
 * One model slot in the admin panel: curated dropdown, an escape hatch to any
 * OpenRouter id, and a probe button that proves the id works on our key before
 * it is saved (roadmap A1).
 */

import { useCallback, useState } from 'react'
import type {
  ModelSettingRoleDef,
  OpenRouterModelOption,
} from '@/shared/agent-kernel/constants/model-settings'
import { isOpenRouterModelId } from '@/shared/agent-kernel/constants/model-settings'
import {
  MODEL_OPTION_CUSTOM,
  MODEL_OPTION_UNSET,
  MODEL_SETTINGS_PROBE_API_PATH,
  ModelSaveState,
  ModelSettingsCopy,
  ModelTestState,
} from '@/shared/admin/constants/model-settings-admin'
import { ContentType, HttpMethod } from '@/shared/data/constants/protocol'
import { readNumber, readString, recordFromJson } from '@/shared/data/json-guards'

const CONTENT_TYPE_HEADER = 'Content-Type'
const SELECT_CLASS =
  'rounded-md border border-black/15 bg-transparent px-2 py-1 text-sm dark:border-white/15'
const INPUT_CLASS = `${SELECT_CLASS} w-56 font-mono`
const BUTTON_CLASS =
  'rounded-md border border-black/15 px-2 py-1 text-xs disabled:opacity-40 dark:border-white/15'

interface ModelSettingRowProps {
  roleDef: ModelSettingRoleDef
  options: OpenRouterModelOption[]
  /** Saved id for this slot, or `''` when it inherits the default slot. */
  current: string
  saveState: ModelSaveState
  onSave: (role: string, model: string) => void
}

interface ProbeOutcome {
  state: ModelTestState
  message: string
}

const IDLE_PROBE: ProbeOutcome = { state: ModelTestState.Idle, message: '' }

export function ModelSettingRow({
  roleDef,
  options,
  current,
  saveState,
  onSave,
}: ModelSettingRowProps) {
  const isCurated =
    current === MODEL_OPTION_UNSET || options.some(option => option.id === current)
  const [custom, setCustom] = useState(isCurated ? MODEL_OPTION_UNSET : current)
  const [showCustom, setShowCustom] = useState(!isCurated)
  const [probe, setProbe] = useState<ProbeOutcome>(IDLE_PROBE)

  const runProbe = useCallback(async (model: string) => {
    setProbe({ state: ModelTestState.Testing, message: '' })
    try {
      const res = await fetch(MODEL_SETTINGS_PROBE_API_PATH, {
        method: HttpMethod.Post,
        headers: { [CONTENT_TYPE_HEADER]: ContentType.Json },
        body: JSON.stringify({ model }),
      })
      const payload = recordFromJson(await res.json())
      if (payload.ok === true) {
        const latency = readNumber(payload.latencyMs) ?? 0
        setProbe({ state: ModelTestState.Pass, message: `ok · ${latency}ms` })
        return
      }
      setProbe({
        state: ModelTestState.Fail,
        message: readString(payload.error) ?? ModelSettingsCopy.LoadError,
      })
    } catch {
      setProbe({ state: ModelTestState.Fail, message: ModelSettingsCopy.LoadError })
    }
  }, [])

  const onSelect = (value: string) => {
    setProbe(IDLE_PROBE)
    if (value === MODEL_OPTION_CUSTOM) {
      setShowCustom(true)
      return
    }
    setShowCustom(false)
    setCustom(MODEL_OPTION_UNSET)
    onSave(roleDef.role, value)
  }

  const customValid = isOpenRouterModelId(custom)
  const selectValue = showCustom ? MODEL_OPTION_CUSTOM : current

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-black/10 p-4 dark:border-white/10 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="font-medium">{roleDef.label}</div>
        <div className="text-xs opacity-60">{roleDef.description}</div>
      </div>

      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center gap-2">
          <select
            className={SELECT_CLASS}
            value={selectValue}
            onChange={event => onSelect(event.target.value)}
            aria-label={roleDef.label}
          >
            <option value={MODEL_OPTION_UNSET} title={ModelSettingsCopy.AutoHint}>
              {ModelSettingsCopy.InheritOption}
            </option>
            {options.map(option => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
            <option value={MODEL_OPTION_CUSTOM}>{ModelSettingsCopy.CustomOption}</option>
          </select>
          <SaveBadge state={saveState} />
        </div>

        {showCustom ? (
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <input
                className={INPUT_CLASS}
                value={custom}
                placeholder={ModelSettingsCopy.CustomPlaceholder}
                onChange={event => {
                  setCustom(event.target.value)
                  setProbe(IDLE_PROBE)
                }}
                aria-label={`${roleDef.label} custom model id`}
              />
              <button
                type="button"
                className={BUTTON_CLASS}
                disabled={!customValid || probe.state === ModelTestState.Testing}
                onClick={() => void runProbe(custom)}
              >
                {probe.state === ModelTestState.Testing
                  ? ModelSettingsCopy.TestingLabel
                  : ModelSettingsCopy.TestButton}
              </button>
              <button
                type="button"
                className={BUTTON_CLASS}
                disabled={!customValid}
                onClick={() => onSave(roleDef.role, custom.trim())}
              >
                {ModelSettingsCopy.SaveButton}
              </button>
            </div>
            <ProbeBadge probe={probe} fallback={ModelSettingsCopy.CustomHint} />
          </div>
        ) : null}
      </div>
    </div>
  )
}

function ProbeBadge({ probe, fallback }: { probe: ProbeOutcome; fallback: string }) {
  if (probe.state === ModelTestState.Pass) {
    return <span className="text-xs text-green-600">{probe.message}</span>
  }
  if (probe.state === ModelTestState.Fail) {
    return <span className="max-w-xs text-right text-xs text-red-500">{probe.message}</span>
  }
  return <span className="text-xs opacity-50">{fallback}</span>
}

function SaveBadge({ state }: { state: ModelSaveState }) {
  if (state === ModelSaveState.Saving) return <span className="text-xs opacity-60">saving…</span>
  if (state === ModelSaveState.Saved) return <span className="text-xs text-green-600">saved ✓</span>
  if (state === ModelSaveState.Error) return <span className="text-xs text-red-500">error</span>
  return <span className="w-12" />
}
