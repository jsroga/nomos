/**
 * Structured output for the fix-inconsistencies workflow.
 * Pure zod — no Mastra import (same cycle rule as BeatPlanSchema).
 */

import { z } from 'zod'

export enum ContinuityFindingType {
  Character = 'character',
  Timeline = 'timeline',
  WorldRule = 'world_rule',
  PlotLogic = 'plot_logic',
  Tone = 'tone',
  MissingPayoff = 'missing_payoff',
  OrphanedSetup = 'orphaned_setup',
}

export enum ContinuityFindingSeverity {
  Critical = 'critical',
  Major = 'major',
  Minor = 'minor',
}

export enum ContinuityAffectedKind {
  Character = 'character',
  Beat = 'beat',
  Episode = 'episode',
  WorldRule = 'world_rule',
  Premise = 'premise',
}

export const ContinuityAffectedSchema = z.object({
  kind: z.nativeEnum(ContinuityAffectedKind),
  id: z.string().min(1),
  fieldPath: z.string().min(1).describe('JSON path of the offending field'),
  name: z.string().optional(),
})

export const ContinuityFindingSchema = z.object({
  id: z.string().min(1),
  type: z.nativeEnum(ContinuityFindingType),
  severity: z.nativeEnum(ContinuityFindingSeverity),
  quote: z.string().min(1).describe('Verbatim quote of the offending passage'),
  why: z.string().min(1).describe('Why this passage fails canon or continuity'),
  affected: z.array(ContinuityAffectedSchema).min(1),
  patchable: z
    .boolean()
    .describe('False when the fix would create or delete a beat/card'),
})

export const ContinuityScanReportSchema = z.object({
  findings: z
    .array(ContinuityFindingSchema)
    .max(20)
    .describe('Most severe first. Empty array = no findings.'),
})

export const ConsistencyChangeSchema = z.object({
  path: z.string().min(1).describe('JSON path to the field'),
  before: z.string(),
  after: z.string(),
  reason: z.string().min(1),
})

export const ConsistencyFixItemSchema = z.object({
  id: z.string().min(1),
  inconsistencyId: z.string().min(1),
  targetElement: z.object({
    type: z.nativeEnum(ContinuityAffectedKind),
    id: z.string().min(1),
    name: z.string().optional(),
  }),
  changes: z.array(ConsistencyChangeSchema).min(1),
})

export const ConsistencyFixBatchSchema = z.object({
  fixes: z
    .array(ConsistencyFixItemSchema)
    .max(20)
    .describe('Patches for existing fields only. Empty = no patches.'),
})

export type ContinuityFinding = z.infer<typeof ContinuityFindingSchema>
export type ContinuityScanReport = z.infer<typeof ContinuityScanReportSchema>
export type ConsistencyFixItem = z.infer<typeof ConsistencyFixItemSchema>
export type ConsistencyFixBatch = z.infer<typeof ConsistencyFixBatchSchema>
