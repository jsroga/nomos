/**
 * The raw OpenRouter client, for task code that has not moved to the gateway.
 *
 * Five task helpers call `openai.chat.completions.create` directly, with no
 * `ProjectScope` in hand. They are a **named gap in the SPEC-13 migration**,
 * not a decision — isolated here so `visual-subject-llm.ts` can stay on the
 * gateway rather than carrying two paths, and so gate A2's exemption names one
 * file instead of five.
 *
 * Removing this module is what closes the gap: each caller needs
 * `systemScope(payload.projectId, SystemScopeReason.JobContext)` threaded to
 * it, which every task payload can now supply.
 */
import OpenAI from 'openai'
import { openRouterClientConfig } from '@/shared/agent-kernel/models'

export function createVisualSubjectClient(): OpenAI | null {
  const { apiKey, baseURL } = openRouterClientConfig()
  if (!apiKey) return null
  return new OpenAI({ apiKey, baseURL })
}
