import { z } from 'zod'
import { MechanicNodeKind } from '../../constants/mechanics-designer-wire'

export enum MechanicConnectionKind {
  Triggers = 'triggers',
  Enables = 'enables',
  Requires = 'requires',
  Conflicts = 'conflicts',
  Enhances = 'enhances',
}

const MechanicsDesignerBalanceSchema = z.object({
  effort: z.number(),
  reward: z.number(),
  frequency: z.number(),
})

const MechanicsDesignerMechanicSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  type: z.enum([
    MechanicNodeKind.Core,
    MechanicNodeKind.Secondary,
    MechanicNodeKind.Meta,
    MechanicNodeKind.Progression,
    MechanicNodeKind.Reward,
  ]),
  description: z.string(),
  inputs: z.array(z.string()),
  outputs: z.array(z.string()),
  balanceFactors: MechanicsDesignerBalanceSchema.optional(),
  examples: z.array(z.string()).optional(),
})

const MechanicsDesignerConnectionSchema = z.object({
  id: z.string().optional(),
  source: z.string(),
  target: z.string(),
  type: z.enum([
    MechanicConnectionKind.Triggers,
    MechanicConnectionKind.Enables,
    MechanicConnectionKind.Requires,
    MechanicConnectionKind.Conflicts,
    MechanicConnectionKind.Enhances,
  ]),
  label: z.string().optional(),
})

export const MechanicsDesignerOutputSchema = z.object({
  analysis: z.string(),
  mechanics: z.array(MechanicsDesignerMechanicSchema),
  connections: z.array(MechanicsDesignerConnectionSchema),
  message: z.string(),
})

export type MechanicsDesignerOutput = z.infer<typeof MechanicsDesignerOutputSchema>
