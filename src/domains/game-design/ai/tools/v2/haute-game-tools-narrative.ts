import { createTool } from '@mastra/core/tools'
import {
  GreyPaletteOutputSchema,
  MemoryKeeperOutputSchema,
  MundanePoetOutputSchema,
  StrandWeaverOutputSchema,
} from '../../../core/schemas'
import { getErrorMessage } from '@/shared/errors/error-utils'
import {
  GreyPaletteInputSchema,
  MemoryKeeperInputSchema,
  MundanePoetInputSchema,
  StrandWeaverInputSchema,
} from '../../constants/haute-game-tool-schemas'
import {
  buildGreyPalettePrompt,
  buildMemoryKeeperPrompt,
  buildMundanePoetPrompt,
  buildStrandWeaverPrompt,
} from '../../constants/haute-game-tool-prompts'
import { HauteGameToolId } from '../../constants/haute-game-tool-wire'
import { createHauteGameModel, invokeLlmJsonPrompt } from './game-design-llm-shared'

export const createMemoryKeeperTool = () =>
  createTool({
    id: HauteGameToolId.DesignWorldMemory,
    description: `Designs systems where the world remembers player actions.
NPCs witness events, rumors spread, and past actions seed future quests.
Inspired by CDPR's narrative depth: every quest connects, nothing is throwaway.`,
    inputSchema: MemoryKeeperInputSchema,
    execute: async (args) => {
      try {
        const prompt = buildMemoryKeeperPrompt(args)
        const parsed = await invokeLlmJsonPrompt(prompt, createHauteGameModel())
        const validated = MemoryKeeperOutputSchema.parse(parsed)
        return { success: true, ...validated }
      } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error) }
      }
    },
  })

export const createGreyPaletteTool = () =>
  createTool({
    id: HauteGameToolId.DesignMoralChoices,
    description: `Creates morally complex choices where no option is clearly "right."
Every choice has real cost, factions react, and consequences ripple through time.
Inspired by CDPR: "Evil is evil, lesser, greater, middling... makes no difference."`,
    inputSchema: GreyPaletteInputSchema,
    execute: async (args) => {
      try {
        const prompt = buildGreyPalettePrompt(args)
        const parsed = await invokeLlmJsonPrompt(prompt, createHauteGameModel())
        const validated = GreyPaletteOutputSchema.parse(parsed)
        return { success: true, ...validated }
      } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error) }
      }
    },
  })

export const createStrandWeaverTool = () =>
  createTool({
    id: HauteGameToolId.DesignStrandConnections,
    description: `Designs asynchronous multiplayer systems where players leave traces for others.
Not lobbies or chat - legacies, echoes, inherited consequences.
Inspired by Kojima: "Games should connect strangers in ways social media never could."`,
    inputSchema: StrandWeaverInputSchema,
    execute: async (args) => {
      try {
        const prompt = buildStrandWeaverPrompt(args)
        const parsed = await invokeLlmJsonPrompt(prompt, createHauteGameModel())
        const validated = StrandWeaverOutputSchema.parse(parsed)
        return { success: true, ...validated }
      } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error) }
      }
    },
  })

export const createMundanePoetTool = () =>
  createTool({
    id: HauteGameToolId.DesignMeaningfulMundane,
    description: `Transforms routine mechanics into meaningful rituals.
Walking, cooking, waiting - these can be profound when designed with intention.
Inspired by Kojima: "Death Stranding taught us walking can be profound."`,
    inputSchema: MundanePoetInputSchema,
    execute: async (args) => {
      try {
        const prompt = buildMundanePoetPrompt(args)
        const parsed = await invokeLlmJsonPrompt(prompt, createHauteGameModel())
        const validated = MundanePoetOutputSchema.parse(parsed)
        return { success: true, ...validated }
      } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error) }
      }
    },
  })
