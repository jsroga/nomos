import { z } from 'zod'
import { recordFromJson, readNumber, readString, stringArrayFromJson } from '@/shared/data/json-guards'
import { ScorerId } from './constants'
import type { StructuralScore } from './types'

const DumpedBeatRowSchema = z.object({
  id: z.string().min(1),
  episodeId: z.string().min(1),
  sequence: z.number().int().positive(),
  logline: z.string().min(1),
  beatType: z.string().min(1),
  content: z.string().nullable().optional(),
  visualHook: z.string().nullable().optional(),
  charactersInvolved: z.array(z.string()).optional(),
  causalDependencies: z.array(z.string()).optional(),
  setupsPayoffs: z.record(z.unknown()).optional(),
  status: z.string().optional(),
})

function coerceRow(value: unknown): { row: unknown; repaired: boolean } {
  const raw = recordFromJson(value)
  const sequence = readNumber(raw.sequence) ?? Number(readString(raw.sequence))
  const repairedSequence = readNumber(raw.sequence) === undefined && Number.isFinite(sequence)
  const depsMissing = raw.causalDependencies === undefined
  const next = {
    ...raw,
    sequence: Number.isFinite(sequence) ? sequence : raw.sequence,
    causalDependencies: depsMissing ? [] : stringArrayFromJson(raw.causalDependencies),
    charactersInvolved: stringArrayFromJson(raw.charactersInvolved),
    setupsPayoffs: recordFromJson(raw.setupsPayoffs),
  }
  return { row: next, repaired: repairedSequence || depsMissing }
}

export function scoreSchemaValidity(rawBeats: readonly unknown[]): StructuralScore {
  let parsed = 0
  let rawFailures = 0
  let repaired = 0
  let retriesNeeded = 0
  const flags: Array<{ index: number; reason: string; repaired: boolean }> = []

  for (let index = 0; index < rawBeats.length; index += 1) {
    const raw = rawBeats[index]
    const rawRecord = recordFromJson(raw)
    const retries = readNumber(rawRecord.retries)
    if (retries !== undefined && retries > 0) retriesNeeded += retries

    const direct = DumpedBeatRowSchema.safeParse(raw)
    if (direct.success) {
      parsed += 1
      continue
    }
    const coerced = coerceRow(raw)
    const afterRepair = DumpedBeatRowSchema.safeParse(coerced.row)
    if (afterRepair.success) {
      parsed += 1
      repaired += 1
      flags.push({ index, reason: 'repaired', repaired: true })
      continue
    }
    rawFailures += 1
    flags.push({ index, reason: direct.error.issues[0]?.message ?? 'invalid', repaired: false })
  }

  const total = rawBeats.length
  return {
    id: ScorerId.SchemaValidity,
    metrics: {
      parseRate: total === 0 ? 1 : parsed / total,
      rawFailures,
      repairedCount: repaired,
      retriesNeeded,
    },
    flags,
  }
}
