/** Partial bible merge action Zod schemas. */
import { z } from 'zod'
import { FactionSchema, WorldRuleSchema } from './beat-core-schemas'
import {
  InspirationItemSchema,
  SeasonStructureSchema,
  SoundtrackTrackSchema,
  StoryArcSchema,
} from './story-plan-schemas'
// --- Partial Bible Update Actions (Smart Merge) ---

export const MergeModeSchema = z.enum(['replace', 'merge', 'smart'])

export const UpdateWorldRulesActionSchema = z.object({
  type: z.literal('UPDATE_WORLD_RULES'),
  payload: z.object({
    rules: z.array(WorldRuleSchema),
    mergeMode: MergeModeSchema.describe(
      'replace: overwrite all, merge: add new, smart: match by rule name and update/add'
    ),
  }),
})

export const UpdateFactionsActionSchema = z.object({
  type: z.literal('UPDATE_FACTIONS'),
  payload: z.object({
    factions: z.array(FactionSchema),
    mergeMode: MergeModeSchema.describe(
      'replace: overwrite all, merge: add new, smart: match by id/name and update/add'
    ),
  }),
})

export const UpdateInspirationsActionSchema = z.object({
  type: z.literal('UPDATE_INSPIRATIONS'),
  payload: z.object({
    inspirations: z.object({
      books: z.array(InspirationItemSchema).nullable().optional(),
      movies: z.array(InspirationItemSchema).nullable().optional(),
      games: z.array(InspirationItemSchema).nullable().optional(),
    }),
    mergeMode: z.enum(['replace', 'merge']).nullable().optional(),
  }),
})

export const UpdateWorldDescriptionActionSchema = z.object({
  type: z.literal('UPDATE_WORLD_DESCRIPTION'),
  payload: z.object({
    description: z.string(),
  }),
})

export const UpdateMoodSoundtrackActionSchema = z.object({
  type: z.literal('UPDATE_MOOD_SOUNDTRACK'),
  payload: z.object({
    moodSoundtrack: z.string().describe('Atmosphere description and soundtrack suggestion'),
  }),
})

export const UpdateSoundtracksActionSchema = z.object({
  type: z.literal('UPDATE_SOUNDTRACKS'),
  payload: z.object({
    soundtracks: z.array(SoundtrackTrackSchema),
    mergeMode: z.enum(['replace', 'merge']).nullable().optional(),
  }),
})

export const UpdatePlotTwistsActionSchema = z.object({
  type: z.literal('UPDATE_PLOT_TWISTS'),
  payload: z.object({
    plotTwists: z.array(z.string()),
    mergeMode: z.enum(['replace', 'merge']).nullable().optional(),
  }),
})

export const UpdateKeyCharactersActionSchema = z.object({
  type: z.literal('UPDATE_KEY_CHARACTERS'),
  payload: z.object({
    keyCharacters: z.array(
      z.object({
        name: z.string(),
        role: z.string(),
        archetype: z.string(),
        motivation: z.string(),
        factionId: z.string().nullable(),
      })
    ),
    mergeMode: MergeModeSchema.describe(
      'replace: overwrite all, merge: add new, smart: match by name and update/add'
    ),
  }),
})

export const UpdateEpisodeRoadmapActionSchema = z.object({
  type: z.literal('UPDATE_EPISODE_ROADMAP'),
  payload: z.object({
    sequences: z.array(StoryArcSchema),
    seasonStructure: SeasonStructureSchema.nullable().optional(),
    executiveSummary: z.string().nullable().optional(),
    mergeMode: z.enum(['replace', 'merge']).nullable().optional(),
  }),
})

export const UpdateSeasonStructureActionSchema = z.object({
  type: z.literal('UPDATE_SEASON_STRUCTURE'),
  payload: z.object({
    seasonStructure: SeasonStructureSchema,
  }),
})

export const UpdateRoadmapSummaryActionSchema = z.object({
  type: z.literal('UPDATE_ROADMAP_SUMMARY'),
  payload: z.object({
    executiveSummary: z.string().describe('2-3 sentence pitch summarizing the entire season arc'),
  }),
})
