import { z } from 'zod'

export const SkillEvalCaseSchema = z.object({
  id: z.union([z.number(), z.string()]),
  prompt: z.string().min(10),
  expected_output: z.string().min(10),
  files: z.array(z.string()).optional(),
  assertions: z.array(z.string().min(5)).optional(),
})

export const SkillEvalsFileSchema = z.object({
  skill_name: z.string().min(1),
  evals: z.array(SkillEvalCaseSchema).min(1),
})
