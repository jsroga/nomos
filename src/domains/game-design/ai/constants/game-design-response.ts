import { z } from 'zod'
import { AnalyzeBalanceOutputSchema, GameLoopSchema, GameMechanicSchema } from '../../core/schemas'
import { isPlainObject, readString } from '@/shared/data/json-guards'

export enum GameDesignResponseType {
  AskUser = 'ASK_USER',
  ProposePlan = 'PROPOSE_PLAN',
  ExecuteStep = 'EXECUTE_STEP',
  Finish = 'FINISH',
}

const RESPONSE_TYPES: GameDesignResponseType[] = [
  GameDesignResponseType.AskUser,
  GameDesignResponseType.ProposePlan,
  GameDesignResponseType.ExecuteStep,
  GameDesignResponseType.Finish,
]

export function isGameDesignResponseType(value: string): value is GameDesignResponseType {
  return RESPONSE_TYPES.some(responseType => responseType === value)
}

export type GameDesignBalanceAnalysis = z.infer<typeof AnalyzeBalanceOutputSchema>

export type GameDesignResponse =
  | {
      type: GameDesignResponseType.AskUser
      payload: { question: string; options?: string[] }
      thought?: string
    }
  | { type: GameDesignResponseType.ProposePlan; payload: { plan: unknown }; thought?: string }
  | {
      type: GameDesignResponseType.ExecuteStep
      payload: {
        tool: string
        result?: unknown
        mechanics?: z.infer<typeof GameMechanicSchema>[]
        loops?: z.infer<typeof GameLoopSchema>[]
        balanceAnalysis?: GameDesignBalanceAnalysis
      }
      thought?: string
    }
  | {
      type: GameDesignResponseType.Finish
      payload: {
        result: string
        mechanics?: z.infer<typeof GameMechanicSchema>[]
        loops?: z.infer<typeof GameLoopSchema>[]
        balanceAnalysis?: GameDesignBalanceAnalysis
      }
      thought?: string
    }

const AskUserPayloadSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).optional(),
})

const FinishPayloadSchema = z.object({
  result: z.string(),
  mechanics: z.array(GameMechanicSchema).optional(),
  loops: z.array(GameLoopSchema).optional(),
  balanceAnalysis: AnalyzeBalanceOutputSchema.optional(),
})

const ExecuteStepPayloadSchema = z.object({
  tool: z.string(),
  result: z.unknown().optional(),
  mechanics: z.array(GameMechanicSchema).optional(),
  loops: z.array(GameLoopSchema).optional(),
  balanceAnalysis: AnalyzeBalanceOutputSchema.optional(),
})

export function parseGameDesignResponseRecord(
  value: unknown,
  thought: string
): GameDesignResponse | null {
  if (!isPlainObject(value)) return null

  const type = readString(value.type)
  if (!type || !isGameDesignResponseType(type)) return null

  const payload = value.payload

  switch (type) {
    case GameDesignResponseType.AskUser: {
      const parsed = AskUserPayloadSchema.safeParse(payload)
      if (!parsed.success) return null
      return { type, payload: parsed.data, thought }
    }
    case GameDesignResponseType.ProposePlan: {
      if (!isPlainObject(payload) && payload !== undefined) return null
      return { type, payload: { plan: isPlainObject(payload) ? payload.plan : payload }, thought }
    }
    case GameDesignResponseType.ExecuteStep: {
      const parsed = ExecuteStepPayloadSchema.safeParse(payload)
      if (!parsed.success) return null
      return { type, payload: parsed.data, thought }
    }
    case GameDesignResponseType.Finish: {
      const parsed = FinishPayloadSchema.safeParse(payload)
      if (!parsed.success) return null
      return { type, payload: parsed.data, thought }
    }
    default:
      return null
  }
}
