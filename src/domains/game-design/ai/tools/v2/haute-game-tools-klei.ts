import { createTool } from '@mastra/core/tools'
import {
  AtomicLoomOutputSchema,
  SilentTeacherOutputSchema,
} from '../../../core/schemas'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { AtomicLoomInputSchema, SilentTeacherInputSchema } from '../../constants/haute-game-tool-schemas'
import {
  buildAtomicLoomPrompt,
  buildSilentTeacherPrompt,
} from '../../constants/haute-game-tool-prompts'
import { HauteGameToolId } from '../../constants/haute-game-tool-wire'
import { createHauteGameModel, invokeLlmJsonPrompt } from './game-design-llm-shared'

export const createAtomicLoomTool = () =>
  createTool({
    id: HauteGameToolId.DesignAtomicSystems,
    description: `Breaks a game concept into atomic verbs and nouns, then maps their interactions.
Creates elegant rule systems where simple elements combine into emergent complexity.
Inspired by Klei's design philosophy: few rules, many outcomes.`,
    inputSchema: AtomicLoomInputSchema,
    execute: async (args) => {
      try {
        const prompt = buildAtomicLoomPrompt(args)
        const parsed = await invokeLlmJsonPrompt(prompt, createHauteGameModel())
        const validated = AtomicLoomOutputSchema.parse(parsed)
        return { success: true, ...validated }
      } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error) }
      }
    },
  })

export const createSilentTeacherTool = () =>
  createTool({
    id: HauteGameToolId.DesignImplicitTutorial,
    description: `Designs learning through play, not instruction.
No tutorials, no markers, no "press X to not die." Trust players to discover.
Inspired by Klei: Death should teach, not punish.`,
    inputSchema: SilentTeacherInputSchema,
    execute: async (args) => {
      try {
        const prompt = buildSilentTeacherPrompt(args)
        const parsed = await invokeLlmJsonPrompt(prompt, createHauteGameModel())
        const validated = SilentTeacherOutputSchema.parse(parsed)
        return { success: true, ...validated }
      } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error) }
      }
    },
  })
