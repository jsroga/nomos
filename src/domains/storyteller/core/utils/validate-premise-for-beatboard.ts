import { recordFromJson } from '@/shared/data/deep-merge'
import {
  BeatboardPremiseFieldKey,
  BeatboardPremiseMin,
  BeatboardPremiseRequirement,
  BeatboardPremiseValidationCopy,
} from '@/domains/storyteller/core/constants/beatboard-premise-validation'

export interface BeatboardPremiseReady {
  ok: true
}

export interface BeatboardPremiseBlocked {
  ok: false
  missing: BeatboardPremiseRequirement[]
  message: string
}

export type BeatboardPremiseValidation = BeatboardPremiseReady | BeatboardPremiseBlocked

const PROSE_REQUIREMENTS: ReadonlyArray<{
  key: BeatboardPremiseFieldKey
  label: BeatboardPremiseRequirement
  min: BeatboardPremiseMin
}> = [
  {
    key: BeatboardPremiseFieldKey.Logline,
    label: BeatboardPremiseRequirement.Logline,
    min: BeatboardPremiseMin.ProseChars,
  },
  {
    key: BeatboardPremiseFieldKey.ProtagonistHook,
    label: BeatboardPremiseRequirement.ProtagonistHook,
    min: BeatboardPremiseMin.ProseChars,
  },
  {
    key: BeatboardPremiseFieldKey.FatalFlaw,
    label: BeatboardPremiseRequirement.FatalFlaw,
    min: BeatboardPremiseMin.ShortChars,
  },
  {
    key: BeatboardPremiseFieldKey.Stakes,
    label: BeatboardPremiseRequirement.Stakes,
    min: BeatboardPremiseMin.ProseChars,
  },
  {
    key: BeatboardPremiseFieldKey.InevitableConsequence,
    label: BeatboardPremiseRequirement.InevitableConsequence,
    min: BeatboardPremiseMin.ProseChars,
  },
]

function trimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function isFilledProse(value: unknown, min: number): boolean {
  return trimmedString(value).length >= min
}

function tenPointEntryFilled(item: unknown): boolean {
  if (typeof item === 'string') {
    return item.trim().length >= BeatboardPremiseMin.ShortChars
  }
  const record = recordFromJson(item)
  return Object.values(record).some(
    value => typeof value === 'string' && value.trim().length >= BeatboardPremiseMin.ShortChars
  )
}

function filledTenPointCount(value: unknown): number {
  if (!Array.isArray(value)) return 0
  return value.filter(tenPointEntryFilled).length
}

function hasPremiseSignal(record: Record<string, unknown>): boolean {
  if (PROSE_REQUIREMENTS.some(field => trimmedString(record[field.key]).length > 0)) {
    return true
  }
  return filledTenPointCount(record[BeatboardPremiseFieldKey.TenPointsPlan]) > 0
}

/** Prefer nested `premise`; fall back to flattened episode-plan fields. */
export function episodePremiseFromPlan(plan: unknown): Record<string, unknown> | null {
  const record = recordFromJson(plan)
  if (Object.keys(record).length === 0) return null
  const nested = recordFromJson(record[BeatboardPremiseFieldKey.Premise])
  if (Object.keys(nested).length > 0) return nested
  return record
}

function blocked(missing: BeatboardPremiseRequirement[]): BeatboardPremiseBlocked {
  if (missing.length === 0) {
    return {
      ok: false,
      missing,
      message: BeatboardPremiseValidationCopy.NoPremise,
    }
  }
  return {
    ok: false,
    missing,
    message: `${BeatboardPremiseValidationCopy.TooThin} ${BeatboardPremiseValidationCopy.MissingPrefix}${missing.join(BeatboardPremiseValidationCopy.ListJoin)}${BeatboardPremiseValidationCopy.MessageEnd}`,
  }
}

export function validatePremiseForBeatboard(premise: unknown): BeatboardPremiseValidation {
  const record = recordFromJson(premise)
  if (Object.keys(record).length === 0 || !hasPremiseSignal(record)) {
    return {
      ok: false,
      missing: [],
      message: BeatboardPremiseValidationCopy.NoPremise,
    }
  }

  const missing: BeatboardPremiseRequirement[] = []
  for (const field of PROSE_REQUIREMENTS) {
    if (!isFilledProse(record[field.key], field.min)) {
      missing.push(field.label)
    }
  }
  if (filledTenPointCount(record[BeatboardPremiseFieldKey.TenPointsPlan]) < BeatboardPremiseMin.TenPoints) {
    missing.push(BeatboardPremiseRequirement.TenPointsPlan)
  }

  if (missing.length > 0) return blocked(missing)
  return { ok: true }
}
