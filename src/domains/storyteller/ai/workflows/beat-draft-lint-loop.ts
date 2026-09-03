import '@/shared/data/server-guard'
import { FindingSeverity, type Finding } from '@/domains/storyteller/core/types/finding'
import { formatCriticReport } from '@/domains/storyteller/ai/agents/critics'
import type { BeatPlan } from '@/domains/storyteller/ai/agents/BeatPlanner/beat-plan-schema'
import type { BeatDraftCanon } from '@/domains/storyteller/core/types/beat-draft-canon'
import type { BeatDraftContext } from './beat-draft-deps-types'
import { LintRedraftMax, BeatDraftLintReportName } from './constants/beat-draft-workflow'

export function formatFindingsForAuthor(findings: Finding[]): string {
  return formatCriticReport(BeatDraftLintReportName.ProseCheck, { findings })
}

export async function runLintRedraftLoop(input: {
  draft: string
  plan: BeatPlan
  ctx: BeatDraftContext
  canon: BeatDraftCanon
  authorCanon: string
  runProseCheck: (args: {
    draft: string
    plan: BeatPlan
    ctx: BeatDraftContext
    canon: BeatDraftCanon
  }) => Promise<Finding[]>
  draftBeat: (
    ctx: BeatDraftContext,
    canon: string,
    plan: BeatPlan,
    lintFeedback?: string
  ) => Promise<string>
}): Promise<{ draft: string; skipCritics: boolean; lintReport: string }> {
  let draft = input.draft
  let findings = await input.runProseCheck({
    draft,
    plan: input.plan,
    ctx: input.ctx,
    canon: input.canon,
  })
  let redrafts = 0
  while (
    findings.some(finding => finding.severity === FindingSeverity.Error) &&
    redrafts < LintRedraftMax.Value
  ) {
    draft = await input.draftBeat(
      input.ctx,
      input.authorCanon,
      input.plan,
      formatFindingsForAuthor(findings)
    )
    findings = await input.runProseCheck({
      draft,
      plan: input.plan,
      ctx: input.ctx,
      canon: input.canon,
    })
    redrafts += 1
  }
  const skipCritics = findings.some(finding => finding.severity === FindingSeverity.Error)
  return {
    draft,
    skipCritics,
    lintReport: formatFindingsForAuthor(findings),
  }
}
