import { z } from 'zod'

export enum BalanceIssueSeverity {
  Critical = 'critical',
  Warning = 'warning',
  Suggestion = 'suggestion',
}

export enum BalanceIssueKind {
  RewardImbalance = 'reward_imbalance',
  EffortMismatch = 'effort_mismatch',
  LoopBreak = 'loop_break',
  DeadEnd = 'dead_end',
  GrindDetected = 'grind_detected',
}

const BalanceIssueSchema = z.object({
  severity: z.enum([
    BalanceIssueSeverity.Critical,
    BalanceIssueSeverity.Warning,
    BalanceIssueSeverity.Suggestion,
  ]),
  type: z.enum([
    BalanceIssueKind.RewardImbalance,
    BalanceIssueKind.EffortMismatch,
    BalanceIssueKind.LoopBreak,
    BalanceIssueKind.DeadEnd,
    BalanceIssueKind.GrindDetected,
  ]),
  description: z.string(),
  affectedMechanics: z.array(z.string()),
  suggestedFix: z.string().optional(),
})

export const BalanceAnalystOutputSchema = z.object({
  analysis: z.string(),
  overallScore: z.number(),
  issues: z.array(BalanceIssueSchema),
  recommendations: z.array(z.string()),
  message: z.string(),
})

export type BalanceAnalystOutput = z.infer<typeof BalanceAnalystOutputSchema>
