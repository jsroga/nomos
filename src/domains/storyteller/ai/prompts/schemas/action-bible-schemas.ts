/** Bible and premise action Zod schemas. */
import { z } from 'zod'
import { FactionSchema, WorldRuleSchema } from './beat-core-schemas'
import { StoryPlanSchema } from './story-plan-schemas'
export const UpdateSeriesBibleActionSchema = z.object({
  type: z.literal('UPDATE_SERIES_BIBLE'),
  payload: z.object({
    genre: z.string().nullable().optional(),
    tone: z.string().nullable().optional(),
    themes: z.array(z.string()).nullable().optional(),
    worldRules: z.array(WorldRuleSchema).nullable().optional(),
    factions: z.array(FactionSchema).nullable().optional(),
    storyPlan: StoryPlanSchema.nullable().optional(),
  }),
})

export const EpisodePremiseSchema = z.object({
  // Core identification
  title: z.string().describe('The episode title (e.g. Ozymandias)'),
  logline: z.string().describe('One sentence summary of the episode'),

  // Ozymandias Framework fields
  theHook: z
    .string()
    .describe('Opening image/situation that immediately grabs attention and poses a question'),
  theTurn: z
    .string()
    .describe('Midpoint/key event where the flaw causes a critical error or revelation'),
  theAftermath: z.string().describe('The world or character is irreversibly changed'),

  // Character-focused fields
  protagonistHook: z.string().nullable().describe('The protagonist-specific opening situation'),
  fatalFlaw: z.string().describe('The internal character flaw that drives the conflict'),
  stakes: z.string().describe('What is at risk (Physical/Professional/Psychological)'),
  transformation: z.string().describe('How the character/world changes by the end'),
  inevitableConsequence: z.string().describe('The irreversible outcome caused by the flaw'),

  // Meta
  thematicFocus: z.string().describe('The specific theme explored in this episode (e.g. Hubris)'),
  charactersInvolved: z.array(z.string()).describe('Key characters in this episode'),
  tenPointsPlan: z.array(z.union([z.string(), z.record(z.string())])).describe('A 10-point plan from start to finish'),
})

// Partial version with all fields nullable (required for OpenAI structured output)
export const EpisodePremisePartialSchema = z.object({
  title: z.string().nullable().optional().describe('The episode title (e.g. Ozymandias)'),
  logline: z.string().nullable().optional().describe('One sentence summary of the episode'),
  theHook: z
    .string()
    .nullable()
    .optional()
    .describe('Opening image/situation that immediately grabs attention'),
  theTurn: z
    .string()
    .nullable()
    .optional()
    .describe('Midpoint/key event where the flaw causes a critical error'),
  theAftermath: z
    .string()
    .nullable()
    .optional()
    .describe('The world or character is irreversibly changed'),
  protagonistHook: z
    .string()
    .nullable()
    .optional()
    .describe('The protagonist-specific opening situation'),
  fatalFlaw: z
    .string()
    .nullable()
    .optional()
    .describe('The internal character flaw that drives the conflict'),
  stakes: z
    .string()
    .nullable()
    .optional()
    .describe('What is at risk (Physical/Professional/Psychological)'),
  transformation: z
    .string()
    .nullable()
    .optional()
    .describe('How the character/world changes by the end'),
  inevitableConsequence: z
    .string()
    .nullable()
    .optional()
    .describe('The irreversible outcome caused by the flaw'),
  thematicFocus: z
    .string()
    .nullable()
    .optional()
    .describe('The specific theme explored in this episode'),
  charactersInvolved: z
    .array(z.string())
    .nullable()
    .optional()
    .describe('Key characters in this episode'),
  tenPointsPlan: z
    .array(z.union([z.string(), z.record(z.string())]))
    .nullable()
    .optional()
    .describe('A 10-point plan from start to finish'),
})

export type EpisodePremise = z.infer<typeof EpisodePremiseSchema>

export const UpdateEpisodePremiseActionSchema = z.object({
  type: z.literal('UPDATE_EPISODE_PREMISE'),
  payload: z.object({
    episodeId: z.string().nullable().optional(),
    premise: EpisodePremisePartialSchema,
  }),
})

export const SetGenreToneActionSchema = z.object({
  type: z.literal('SET_GENRE_AND_TONE'),
  payload: z.object({
    genre: z.string(),
    tone: z.string(),
    styleReference: z.string().nullable().optional(),
  }),
})

export const AddThemeActionSchema = z.object({
  type: z.literal('ADD_THEME'),
  payload: z.object({
    theme: z.string(),
    description: z.string().nullable().optional(),
  }),
})

export const RemoveThemeActionSchema = z.object({
  type: z.literal('REMOVE_THEME'),
  payload: z.object({
    theme: z.string(),
  }),
})

export const CreateLocationActionSchema = z.object({
  type: z.literal('CREATE_LOCATION'),
  payload: z.object({
    name: z.string(),
    description: z.string(),
    visualRef: z.string().nullable().optional(),
  }),
})

export const UpdateLocationActionSchema = z.object({
  type: z.literal('UPDATE_LOCATION'),
  payload: z.object({
    locationId: z.string(),
    updates: z.object({
      name: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      visualRef: z.string().nullable().optional(),
      atmosphere: z.string().nullable().optional(),
      significance: z.string().nullable().optional(),
    }),
  }),
})

export const AddLoreEntryActionSchema = z.object({
  type: z.literal('ADD_LORE_ENTRY'),
  payload: z.object({
    title: z.string(),
    content: z.string(),
    tags: z.array(z.string()).nullable().optional(),
  }),
})

export const DefineMagicSystemActionSchema = z.object({
  type: z.literal('DEFINE_MAGIC_SYSTEM'),
  payload: z.object({
    name: z.string(),
    rules: z.array(z.string()),
    costs: z.array(z.string()).nullable().optional(),
  }),
})
