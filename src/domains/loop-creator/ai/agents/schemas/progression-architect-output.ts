import { z } from 'zod'

export enum ProgressionSystemKind {
  Skill = 'skill',
  Power = 'power',
  Content = 'content',
  Social = 'social',
  Collection = 'collection',
}

export enum ProgressionCurveKind {
  Linear = 'linear',
  Exponential = 'exponential',
  Logarithmic = 'logarithmic',
  SCurve = 's-curve',
  Stepped = 'stepped',
}

const ProgressionMilestoneSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  requiredEffort: z.number(),
  unlocksFeatures: z.array(z.string()),
  rewardType: z.string(),
  playerMotivation: z.string(),
})

const ProgressionSystemSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  type: z.enum([
    ProgressionSystemKind.Skill,
    ProgressionSystemKind.Power,
    ProgressionSystemKind.Content,
    ProgressionSystemKind.Social,
    ProgressionSystemKind.Collection,
  ]),
  milestones: z.array(ProgressionMilestoneSchema),
  curve: z.enum([
    ProgressionCurveKind.Linear,
    ProgressionCurveKind.Exponential,
    ProgressionCurveKind.Logarithmic,
    ProgressionCurveKind.SCurve,
    ProgressionCurveKind.Stepped,
  ]),
})

export const ProgressionArchitectOutputSchema = z.object({
  analysis: z.string(),
  progressionSystems: z.array(ProgressionSystemSchema),
  recommendations: z.array(z.string()),
  message: z.string(),
})

export type ProgressionArchitectOutput = z.infer<typeof ProgressionArchitectOutputSchema>
