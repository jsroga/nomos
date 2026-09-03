/**
 * Structured output contract for the three narrow critics.
 *
 * Critics DIAGNOSE ONLY. Findings share the domain FindingSchema with the
 * cheap linter so a packed lint report and a critic report are the same shape.
 */

import { FindingSchema, type Finding } from '@/domains/storyteller/core/types/finding'
import { z } from 'zod'

export const CriticFindingSchema = FindingSchema
export type CriticFinding = Finding

export const CriticReportSchema = z.object({
  findings: z
    .array(CriticFindingSchema)
    .max(10)
    .describe('Numbered findings, most severe first. Empty array = NO FINDINGS.'),
})

export type CriticReport = z.infer<typeof CriticReportSchema>

/** Render a structured report as the markdown block the author revises against. */
export function formatCriticReport(criticName: string, report: CriticReport): string {
  if (report.findings.length === 0) {
    return `## ${criticName} findings\nNO FINDINGS.`
  }
  const lines = report.findings.map(
    (finding, index) =>
      `${index + 1}. [${finding.severity}] "${finding.location.quote}" — ${finding.whyItFails}`,
  )
  return `## ${criticName} findings\n${lines.join('\n')}`
}
