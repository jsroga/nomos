import {
  isValidationError,
  noopObserve,
  type ToolExecutionContext,
  type ValidationError,
} from '@mastra/core/tools'
import { z } from 'zod'
import type { GameDesignAgent } from '@/domains/game-design'
import { GameLoopSchema } from '@/domains/game-design/core/schemas'
import { GameDesignResponseType } from '../constants/game-design-response'
import {
  mergeLoopProposal,
  parseLoopProposal,
  type LoopProposal,
} from '../constants/loop-proposal'
import {
  GameLoopValidationState,
  GameLoopWorkflowCopy,
  GameLoopTypeInput,
} from '../constants/game-loop-workflow-wire'
import type { BalanceAnalysisResult } from './game-loop-workflow-schemas'
import { BalanceAnalysisSuccessSchema } from './game-loop-workflow-schemas'

export async function invokeWorkflowTool<TInput, TOutput>(
  tool: {
    id: string
    execute?: (
      inputData: TInput,
      context: ToolExecutionContext
    ) => Promise<TOutput | ValidationError | undefined>
  },
  input: TInput
): Promise<TOutput> {
  if (!tool.execute) {
    throw new Error(`Tool ${tool.id} has no execute function`)
  }
  const result = await tool.execute(input, { observe: noopObserve })
  if (result === undefined || result === null) {
    throw new Error(`Tool ${tool.id} returned no result`)
  }
  if (isValidationError(result)) {
    throw new Error(`Tool ${tool.id} input validation failed: ${JSON.stringify(result)}`)
  }
  return result
}

export function extractLoopProposalFromResponse(
  result: Awaited<ReturnType<GameDesignAgent['designLoop']>>
): LoopProposal | undefined {
  if (result.type === GameDesignResponseType.ProposePlan) {
    return parseLoopProposal(result.payload.plan)
  }

  if (result.type === GameDesignResponseType.Finish) {
    return parseLoopProposal(result.payload.result)
  }

  if (result.type === GameDesignResponseType.ExecuteStep) {
    return parseLoopProposal(result.payload.result)
  }

  return undefined
}

export function isBalanceSuccess(
  result: BalanceAnalysisResult | null | undefined
): result is z.infer<typeof BalanceAnalysisSuccessSchema> {
  return result?.success === true
}

export function buildValidatedLoop(loopProposal: LoopProposal): z.infer<typeof GameLoopSchema> {
  const parsedLoop = GameLoopSchema.partial().parse(loopProposal)
  return {
    id: parsedLoop.id ?? crypto.randomUUID(),
    projectId: parsedLoop.projectId ?? crypto.randomUUID(),
    name: parsedLoop.name ?? GameLoopWorkflowCopy.UntitledLoop,
    type: parsedLoop.type ?? GameLoopTypeInput.Core,
    nodes: parsedLoop.nodes ?? [],
    edges: parsedLoop.edges ?? [],
    resources: parsedLoop.resources ?? [],
    validationState: parsedLoop.validationState ?? GameLoopValidationState.Draft,
    createdAt: parsedLoop.createdAt ?? new Date(),
    updatedAt: parsedLoop.updatedAt ?? new Date(),
    metrics: parsedLoop.metrics,
  }
}

export async function refineLoopFromFeedback(
  agent: GameDesignAgent,
  loopProposal: LoopProposal | undefined,
  feedback: string
): Promise<LoopProposal | undefined> {
  const resultText = await agent.run(
    `Refine the following game loop based on user feedback: ${feedback}`,
    `Current loop: ${JSON.stringify(loopProposal)}`
  )

  const jsonMatch = resultText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return loopProposal
  return parseLoopProposal(JSON.parse(jsonMatch[0])) ?? loopProposal
}

export function mergeLoopModifications(
  loopProposal: LoopProposal | undefined,
  modifications: Partial<LoopProposal>
): LoopProposal | undefined {
  return mergeLoopProposal(loopProposal, modifications)
}

export type StructureValidationIssue = { description: string }
