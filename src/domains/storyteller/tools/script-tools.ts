/**
 * Script Editing Tools for LangGraph
 *
 * Wraps script-operations.ts functions as proper DynamicStructuredTools
 * that the Writer agent can invoke via tool-calling.
 */

import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import {
  expandScene,
  condenseScene,
  improveDialogue,
  addVisualHook,
  shiftTone,
  regenerateText,
} from '../services/script-operations'

// =================================================================
// SCRIPT EDITING TOOLS
// =================================================================

export const expandSceneTool = new DynamicStructuredTool({
  name: 'expand_scene',
  description:
    'Expand a scene with more visual detail, sensory descriptions, and beat-by-beat action. Use this when a scene feels too sparse or needs more cinematic texture.',
  schema: z.object({
    selection: z.string().describe('The script text to expand'),
    beforeContext: z
      .string()
      .optional()
      .describe('Text that comes before the selection for context'),
    afterContext: z.string().optional().describe('Text that comes after the selection for context'),
  }),
  func: async ({ selection, beforeContext, afterContext }) => {
    console.log('[Tool] expand_scene called')
    try {
      const result = await expandScene(selection)
      return result
    } catch (error) {
      console.error('[Tool] expand_scene error:', error)
      return `Error expanding scene: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  },
})

export const condenseSceneTool = new DynamicStructuredTool({
  name: 'condense_scene',
  description:
    'Condense a scene to its essential elements. Remove redundant action lines, tighten dialogue, but keep core dramatic beats. Use when pacing drags.',
  schema: z.object({
    selection: z.string().describe('The script text to condense'),
  }),
  func: async ({ selection }) => {
    console.log('[Tool] condense_scene called')
    try {
      const result = await condenseScene(selection)
      return result
    } catch (error) {
      console.error('[Tool] condense_scene error:', error)
      return `Error condensing scene: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  },
})

export const improveDialogueTool = new DynamicStructuredTool({
  name: 'improve_dialogue',
  description:
    'Improve dialogue for a specific character. Makes it more natural, adds subtext, and ensures it reveals character while advancing the scene.',
  schema: z.object({
    selection: z.string().describe('The dialogue text to improve'),
    characterName: z.string().describe('Name of the character speaking'),
    voiceNotes: z
      .string()
      .optional()
      .describe(
        "Notes about the character's voice (e.g., 'speaks in short sentences', 'uses technical jargon')"
      ),
  }),
  func: async ({ selection, characterName, voiceNotes }) => {
    console.log('[Tool] improve_dialogue called for:', characterName)
    try {
      const result = await improveDialogue(selection, characterName, voiceNotes)
      return result
    } catch (error) {
      console.error('[Tool] improve_dialogue error:', error)
      return `Error improving dialogue: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  },
})

export const addVisualHookTool = new DynamicStructuredTool({
  name: 'add_visual_hook',
  description:
    'Add a strong visual hook to open a scene. Creates an iconic, memorable first image that draws the audience in. Use when scenes lack a compelling opening.',
  schema: z.object({
    selection: z.string().describe('The scene text to add a visual hook to'),
  }),
  func: async ({ selection }) => {
    console.log('[Tool] add_visual_hook called')
    try {
      const result = await addVisualHook(selection)
      return result
    } catch (error) {
      console.error('[Tool] add_visual_hook error:', error)
      return `Error adding visual hook: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  },
})

export const shiftToneTool = new DynamicStructuredTool({
  name: 'shift_tone',
  description:
    'Shift the tone of a section to a target emotional quality. Maintains core story beats but adjusts language, pacing, and imagery.',
  schema: z.object({
    selection: z.string().describe('The script text to adjust'),
    targetTone: z
      .string()
      .describe("The target tone (e.g., 'darker', 'comedic', 'tense', 'melancholic', 'hopeful')"),
  }),
  func: async ({ selection, targetTone }) => {
    console.log('[Tool] shift_tone called, target:', targetTone)
    try {
      const result = await shiftTone(selection, targetTone)
      return result
    } catch (error) {
      console.error('[Tool] shift_tone error:', error)
      return `Error shifting tone: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  },
})

export const regenerateTextTool = new DynamicStructuredTool({
  name: 'regenerate_text',
  description:
    'General-purpose script editing tool. Provide custom instructions for how to edit the selected text.',
  schema: z.object({
    selection: z.string().describe('The script text to edit'),
    instruction: z.string().describe('Specific instructions for how to edit the text'),
    beforeContext: z.string().optional().describe('Text before selection for context'),
    afterContext: z.string().optional().describe('Text after selection for context'),
  }),
  func: async ({ selection, instruction, beforeContext, afterContext }) => {
    console.log('[Tool] regenerate_text called')
    try {
      const result = await regenerateText(selection, instruction, {
        beforeText: beforeContext,
        afterText: afterContext,
      })
      return result
    } catch (error) {
      console.error('[Tool] regenerate_text error:', error)
      return `Error regenerating text: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  },
})

// =================================================================
// EXPORTED TOOL COLLECTION
// =================================================================

export const scriptEditTools = [
  expandSceneTool,
  condenseSceneTool,
  improveDialogueTool,
  addVisualHookTool,
  shiftToneTool,
  regenerateTextTool,
]
