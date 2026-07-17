/** Script and scene action Zod schemas. */
import { z } from 'zod'
// --- Script & Scene ---

export const CreateSceneActionSchema = z.object({
  type: z.literal('CREATE_SCENE'),
  payload: z.object({
    heading: z.string(),
    action: z.string().nullable().optional(),
  }),
})

export const UpdateSceneActionSchema = z.object({
  type: z.literal('UPDATE_SCENE_ACTION'),
  payload: z.object({
    sceneId: z.string(),
    newAction: z.string(),
  }),
})

export const UpdateDialogueActionSchema = z.object({
  type: z.literal('UPDATE_DIALOGUE'),
  payload: z.object({
    sceneId: z.string(),
    characterName: z.string(),
    newDialogue: z.string(),
    parenthetical: z.string().nullable().optional(),
  }),
})

export const ReorderSceneActionSchema = z.object({
  type: z.literal('REORDER_SCENE'),
  payload: z.object({
    sceneId: z.string(),
    newIndex: z.number(),
  }),
})

export const DeleteSceneActionSchema = z.object({
  type: z.literal('DELETE_SCENE'),
  payload: z.object({
    sceneId: z.string(),
  }),
})

export const AddSceneNoteActionSchema = z.object({
  type: z.literal('ADD_SCENE_NOTE'),
  payload: z.object({
    sceneId: z.string(),
    note: z.string(),
    author: z.string().nullable().optional(),
  }),
})

export const SetSceneMoodActionSchema = z.object({
  type: z.literal('SET_SCENE_MOOD'),
  payload: z.object({
    sceneId: z.string(),
    mood: z.string(),
  }),
})

export const UpdateScriptContentActionSchema = z.object({
  type: z.literal('UPDATE_SCRIPT_CONTENT'),
  payload: z.object({
    content: z.string(),
    append: z.boolean().nullable().optional(),
  }),
})
