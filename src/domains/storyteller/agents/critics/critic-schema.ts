/**
 * Structured output contract for the three narrow critics.
 *
 * Critics DIAGNOSE ONLY: every finding quotes the offending passage and says
 * why it fails. There is deliberately no field for suggested replacement
 * prose — critics never rewrite (StoryForge rule; the author holds the vision
 * and may reject findings).
 */

import { z } from 'zod'

export const CriticFindingSchema = z.object({
  quote: z
    .string()
    .min(1)
    .describe('Verbatim quote of the offending passage from the draft'),
  why: z
    .string()
    .min(1)
    .describe('Precisely why this passage fails, within this critic\'s brief'),
  severity: z
    .enum(['critical', 'major', 'minor'])
    .describe('critical = breaks canon/scene; major = hurts quality; minor = polish'),
})

export type CriticFinding = z.infer<typeof CriticFindingSchema>

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
    (f, i) => `${i + 1}. [${f.severity}] "${f.quote}" — ${f.why}`,
  )
  return `## ${criticName} findings\n${lines.join('\n')}`
}
