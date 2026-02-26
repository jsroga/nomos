/**
 * Script Editing Tools - Mastra v2
 *
 * Script manipulation tools for the Writer agent.
 * Migrated from legacy LangChain DynamicStructuredTool.
 */

import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import {
  expandScene,
  condenseScene,
  improveDialogue,
  addVisualHook,
  shiftTone,
  regenerateText,
} from '../../services/script-operations'

// ==========================================
// MASTRA TOOLS
// ==========================================

export const expandSceneTool = createTool({
  id: 'expand_scene',
  description:
    'Expand a scene with more visual detail, sensory descriptions, and beat-by-beat action.',
  inputSchema: z.object({
    selection: z.string().describe('The script text to expand'),
    beforeContext: z.string().optional().describe('Text before selection'),
    afterContext: z.string().optional().describe('Text after selection'),
  }),
  execute: async (args: any) => {
    const context = args?.context || args
    console.log('[Tool] expand_scene called')
    try {
      const result = await expandScene(context.selection, {
        beforeText: context.beforeContext,
        afterText: context.afterContext,
      })
      return result
    } catch (error) {
      return `Error expanding scene: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  },
})

export const condenseSceneTool = createTool({
  id: 'condense_scene',
  description:
    'Condense a scene to essential elements. Tighten dialogue, keep core dramatic beats.',
  inputSchema: z.object({
    selection: z.string().describe('The script text to condense'),
    beforeContext: z.string().optional().describe('Text before selection'),
    afterContext: z.string().optional().describe('Text after selection'),
  }),
  execute: async (args: any) => {
    const context = args?.context || args
    console.log('[Tool] condense_scene called')
    try {
      const result = await condenseScene(context.selection, {
        beforeText: context.beforeContext,
        afterText: context.afterContext,
      })
      return result
    } catch (error) {
      return `Error condensing scene: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  },
})

export const improveDialogueTool = createTool({
  id: 'improve_dialogue',
  description:
    'Improve dialogue for a character. Makes it natural, adds subtext, reveals character.',
  inputSchema: z.object({
    selection: z.string().describe('The dialogue to improve'),
    characterName: z.string().describe('Character speaking'),
    voiceNotes: z.string().optional().describe('Voice notes for the character'),
    beforeContext: z.string().optional().describe('Text before selection'),
    afterContext: z.string().optional().describe('Text after selection'),
  }),
  execute: async (args: any) => {
    const context = args?.context || args
    console.log('[Tool] improve_dialogue called for:', context.characterName)
    try {
      const result = await improveDialogue(
        context.selection,
        context.characterName,
        context.voiceNotes,
        {
          beforeText: context.beforeContext,
          afterText: context.afterContext,
        }
      )
      return result
    } catch (error) {
      return `Error improving dialogue: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  },
})

export const addVisualHookTool = createTool({
  id: 'add_visual_hook',
  description: 'Add a strong visual hook to open a scene. Creates iconic first image.',
  inputSchema: z.object({
    selection: z.string().describe('The scene text'),
    beforeContext: z.string().optional().describe('Text before selection'),
    afterContext: z.string().optional().describe('Text after selection'),
  }),
  execute: async (args: any) => {
    const context = args?.context || args
    console.log('[Tool] add_visual_hook called')
    try {
      const result = await addVisualHook(context.selection, {
        beforeText: context.beforeContext,
        afterText: context.afterContext,
      })
      return result
    } catch (error) {
      return `Error adding visual hook: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  },
})

export const shiftToneTool = createTool({
  id: 'shift_tone',
  description: 'Shift the tone of a section (darker, comedic, tense, melancholic, hopeful).',
  inputSchema: z.object({
    selection: z.string().describe('The script text'),
    targetTone: z.string().describe('Target tone'),
    beforeContext: z.string().optional().describe('Text before selection'),
    afterContext: z.string().optional().describe('Text after selection'),
  }),
  execute: async (args: any) => {
    const context = args?.context || args
    console.log('[Tool] shift_tone called, target:', context.targetTone)
    try {
      const result = await shiftTone(context.selection, context.targetTone, {
        beforeText: context.beforeContext,
        afterText: context.afterContext,
      })
      return result
    } catch (error) {
      return `Error shifting tone: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  },
})

export const regenerateTextTool = createTool({
  id: 'regenerate_text',
  description: 'General-purpose script editing with custom instructions.',
  inputSchema: z.object({
    selection: z.string().describe('The script text'),
    instruction: z.string().describe('Edit instructions'),
    beforeContext: z.string().optional(),
    afterContext: z.string().optional(),
  }),
  execute: async (args: any) => {
    const context = args?.context || args
    console.log('[Tool] regenerate_text called')
    try {
      const result = await regenerateText(context.selection, context.instruction, {
        beforeText: context.beforeContext,
        afterText: context.afterContext,
      })
      return result
    } catch (error) {
      return `Error regenerating text: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  },
})

const scriptTools = [
  expandSceneTool,
  condenseSceneTool,
  improveDialogueTool,
  addVisualHookTool,
  shiftToneTool,
  regenerateTextTool,
]