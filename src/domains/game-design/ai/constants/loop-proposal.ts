import { z } from 'zod'
import { GameLoopSchema, GameMechanicSchema } from '../../core/schemas'
import { isPlainObject, readString } from '@/shared/data/json-guards'

export const LoopProposalSchema = GameLoopSchema.partial().extend({
  mechanics: z.array(GameMechanicSchema).optional(),
  description: z.string().optional(),
})

export type LoopProposal = z.infer<typeof LoopProposalSchema>

export function parseLoopProposal(value: unknown): LoopProposal | undefined {
  const direct = LoopProposalSchema.safeParse(value)
  if (direct.success) return direct.data

  if (typeof value === 'string') {
    try {
      return parseLoopProposal(JSON.parse(value))
    } catch {
      return { description: value }
    }
  }

  const record = isPlainObject(value) ? value : undefined
  const description = record ? readString(record.description) : undefined
  if (description) return { description }

  return undefined
}

export function mergeLoopProposal(
  base: LoopProposal | undefined,
  modifications: unknown
): LoopProposal {
  const patch = LoopProposalSchema.partial().safeParse(modifications)
  if (!base) {
    return patch.success ? patch.data : {}
  }
  if (!patch.success) return base
  return { ...base, ...patch.data }
}
