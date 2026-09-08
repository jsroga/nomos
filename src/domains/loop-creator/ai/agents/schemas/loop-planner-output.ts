import { z } from 'zod'

export enum LoopPlannerPsychPhase {
  Challenge = 'challenge',
  Action = 'action',
  Feedback = 'feedback',
}

export enum LoopPlannerLoopType {
  Core = 'core',
  Session = 'session',
  Meta = 'meta',
  Progression = 'progression',
  Social = 'social',
}

export enum LoopPlannerTimeframe {
  Micro = 'micro',
  Core = 'core',
  Session = 'session',
  Meta = 'meta',
}

export enum LoopPlannerDurationUnit {
  Seconds = 'seconds',
  Minutes = 'minutes',
}

const LoopPlannerNodeSchema = z.object({
  name: z.string(),
  psychPhase: z.enum([
    LoopPlannerPsychPhase.Challenge,
    LoopPlannerPsychPhase.Action,
    LoopPlannerPsychPhase.Feedback,
  ]),
  description: z.string().optional(),
})

const LoopPlannerDurationSchema = z.object({
  min: z.number(),
  max: z.number(),
  typical: z.number(),
  unit: z
    .enum([LoopPlannerDurationUnit.Seconds, LoopPlannerDurationUnit.Minutes])
    .optional(),
})

const LoopPlannerLoopSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  type: z.enum([
    LoopPlannerLoopType.Core,
    LoopPlannerLoopType.Session,
    LoopPlannerLoopType.Meta,
    LoopPlannerLoopType.Progression,
    LoopPlannerLoopType.Social,
  ]),
  timeframe: z
    .enum([
      LoopPlannerTimeframe.Micro,
      LoopPlannerTimeframe.Core,
      LoopPlannerTimeframe.Session,
      LoopPlannerTimeframe.Meta,
    ])
    .optional(),
  description: z.string().optional(),
  mechanics: z.array(z.string()).optional(),
  nodes: z.array(LoopPlannerNodeSchema).optional(),
  duration: LoopPlannerDurationSchema.optional(),
  playerExperience: z.string().optional(),
  satisfactionPeak: z.string().optional(),
})

export const LoopPlannerOutputSchema = z.object({
  analysis: z.string(),
  loops: z.array(LoopPlannerLoopSchema),
  recommendations: z.array(z.string()),
  message: z.string(),
})

export type LoopPlannerOutput = z.infer<typeof LoopPlannerOutputSchema>
