/**
 * Run a critic with structured output and return its typed report.
 * Schema-invalid output degrades to an empty report rather than throwing —
 * a flaky critic must never take down the caller.
 */

import '@/shared/data/server-guard'
import type { Agent } from '@mastra/core/agent'
import { CriticReportSchema, type CriticReport } from './critic-schema'

export async function generateCriticReport(critic: Agent, prompt: string): Promise<CriticReport> {
  const response = await critic.generate(prompt, {
    structuredOutput: { schema: CriticReportSchema },
  })
  const parsed = CriticReportSchema.safeParse(response.object)
  return parsed.success ? parsed.data : { findings: [] }
}
