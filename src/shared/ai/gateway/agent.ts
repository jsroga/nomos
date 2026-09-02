/**
 * Metered Mastra agent invocation.
 *
 * `agent.generate()` reports `usage` on its result and nothing was reading it,
 * so everything an agent did — beat planning, critics, the muse — was invisible
 * spend. This wraps the call, takes the token counts off the result, and
 * records one row.
 *
 * The project comes from {@link currentGatewayContext}, not a parameter: see
 * `call-context.ts` for why.
 */
import { isPlainObject } from '@/shared/data/json-guards'
import {
  AGENT_USAGE_COMPLETION_FIELDS,
  AGENT_USAGE_PROMPT_FIELDS,
  LlmOutcome,
  type LlmFeature,
} from '@/shared/ai/gateway/constants/llm-call'
import { OPENROUTER_PROVIDER } from '@/shared/ai/gateway/constants/provider'
import { currentGatewayContext } from '@/shared/ai/gateway/call-context'
import { recordLlmCall } from '@/shared/ai/gateway/record'

function readTokens(usage: Record<string, unknown>, names: readonly string[]): number {
  for (const name of names) {
    const value = usage[name]
    if (typeof value === 'number' && Number.isFinite(value)) return value
  }
  return 0
}

/** Token counts, when the result reports them. Prefer `totalUsage` over per-call `usage`. */
function usageFrom(result: unknown): Record<string, unknown> | undefined {
  if (!isPlainObject(result)) return undefined
  const total: unknown = result.totalUsage
  if (isPlainObject(total)) return total
  const usage: unknown = result.usage
  return isPlainObject(usage) ? usage : undefined
}

function stepUsages(result: unknown): Record<string, unknown>[] {
  if (!isPlainObject(result) || !Array.isArray(result.steps)) return []
  const usages: Record<string, unknown>[] = []
  for (const step of result.steps) {
    if (!isPlainObject(step)) continue
    const usage: unknown = step.usage
    if (isPlainObject(usage)) usages.push(usage)
  }
  return usages
}

/** The model a Mastra agent resolved to, when the result reports it. */
function modelFrom(result: unknown): string {
  if (!isPlainObject(result)) return ''
  const model: unknown = result.model
  if (typeof model === 'string') return model
  return isPlainObject(model) && typeof model.modelId === 'string' ? model.modelId : ''
}

/**
 * Run an agent call and record what it cost.
 *
 * Takes a thunk rather than the agent, so Mastra's generics survive: the
 * result type is whatever `generate` returned, and a call site converts by
 * wrapping rather than by changing what it reads.
 */
export async function meteredCall<TResult>(
  feature: LlmFeature,
  run: () => Promise<TResult>
): Promise<TResult> {
  const context = currentGatewayContext()
  const startedAt = Date.now()

  try {
    const result = await run()
    if (context) {
      const usage = usageFrom(result)
      await recordLlmCall({
        traceId: context.traceId,
        projectId: context.scope.projectId,
        userId: context.scope.userId,
        feature,
        model: modelFrom(result),
        provider: OPENROUTER_PROVIDER,
        promptTokens: usage ? readTokens(usage, AGENT_USAGE_PROMPT_FIELDS) : 0,
        completionTokens: usage ? readTokens(usage, AGENT_USAGE_COMPLETION_FIELDS) : 0,
        latencyMs: Date.now() - startedAt,
        outcome: LlmOutcome.Ok,
      })
      for (const stepUsage of stepUsages(result)) {
        await recordLlmCall({
          traceId: context.traceId,
          projectId: context.scope.projectId,
          userId: context.scope.userId,
          feature,
          model: modelFrom(result),
          provider: OPENROUTER_PROVIDER,
          promptTokens: readTokens(stepUsage, AGENT_USAGE_PROMPT_FIELDS),
          completionTokens: readTokens(stepUsage, AGENT_USAGE_COMPLETION_FIELDS),
          latencyMs: Date.now() - startedAt,
          outcome: LlmOutcome.Ok,
        })
      }
    }
    return result
  } catch (error) {
    if (context) {
      await recordLlmCall({
        traceId: context.traceId,
        projectId: context.scope.projectId,
        userId: context.scope.userId,
        feature,
        model: '',
        provider: OPENROUTER_PROVIDER,
        promptTokens: 0,
        completionTokens: 0,
        latencyMs: Date.now() - startedAt,
        outcome: LlmOutcome.Error,
      })
    }
    throw error
  }
}
