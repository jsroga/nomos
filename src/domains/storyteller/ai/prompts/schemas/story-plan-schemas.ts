/** Story plan and season structure Zod schemas. */
import { z } from 'zod'
import {
  EventSchema,
  FactionSchema,
  ItemSchema,
  WorldRuleSchema,
} from './beat-core-schemas'
export const StoryArcSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  keyFactionsInvolved: z.array(z.string()),
  worldConsequence: z.string().describe('How the world changes after this arc'),
  consequences: z
    .array(z.string())
    .nullable()
    .optional()
    .describe('Ripple effects: World, Politics, Character'),
  // Advanced Roadmap Fields
  logline: z.string().nullable().optional().describe('Brief 1-sentence TV Guide style summary'),
  thematicFocus: z
    .string()
    .nullable()
    .optional()
    .describe('The specific theme explored in this episode'),
  mainPlotBeat: z.string().nullable().optional().describe('A-Story: The core plot advancement'),
  bPlotBeat: z.string().nullable().optional().describe('B-Story: The character-specific subplot'),
  keyScenes: z.array(z.string()).nullable().optional().describe('Crucial moments or set pieces'),
  hook: z.string().nullable().optional().describe('Teaser/Cold Open: The opening grab'),
  cliffhanger: z
    .string()
    .nullable()
    .optional()
    .describe('The ending hook to drive to the next episode'),
  reasoning: z
    .string()
    .nullable()
    .optional()
    .describe('Showrunner notes: Why this episode is necessary here'),
  actStructure: z.string().nullable().optional().describe('e.g. "3 Acts" or "Teaser + 4 Acts"'),
  // New Roadmap Fields
  protagonistHook: z.string().nullable().optional().describe('Character-specific entry point forcing action'),
  antagonistMove: z.string().nullable().optional().describe('The antagonist\'s counter-move'),
  fatalFlaw: z.string().nullable().optional().describe('Character flaw driving the conflict'),
  thematicQuestion: z.string().nullable().optional().describe('The philosophical question at stake'),
})

export type StorySequence = z.infer<typeof StoryArcSchema>

// ============================================
// EPISODE ROADMAP SCHEMAS
// ============================================

export const RoadmapEpisodeSchema = z.object({
  title: z.string(),
  logline: z.string(),
  incitingIncident: z.string().nullable().optional(),
  midpoint: z.string().nullable().optional(),
  finale: z.string().nullable().optional(),
  // New Roadmap Fields
  protagonistHook: z.string().nullable().optional(),
  antagonistMove: z.string().nullable().optional(),
  fatalFlaw: z.string().nullable().optional(),
  thematicQuestion: z.string().nullable().optional(),
})

export const EpisodeRoadmapSchema = z.object({
  episodes: z.array(RoadmapEpisodeSchema).optional().describe('List of episodes in the season'),
  sequences: z.array(RoadmapEpisodeSchema).optional().describe('Legacy alias for episodes'),
  seasonStructure: z.record(z.unknown()).optional(), // Flexible for now (SeasonStructureSchema is declared below)
  executiveSummary: z.string().optional(),
})


// Season Structure Schema (New Root Level Object)
export const SeasonStructureSchema = z.object({
  seasonLogline: z.string().describe('The elevator pitch for the entire season'),
  incitingIncident: z.string().describe('The event that starts the clock (Ep 1-2)'),
  midpointClimax: z.string().describe('The point of no return (Ep 4-5)'),
  seasonClimax: z.string().describe('The final confrontation (Ep 8-10)'),
  resolution: z.string().describe('The new normal after the climax'),
  themeExploration: z.string().describe('How the central theme is challenged/explored'),
})

export type SeasonStructure = z.infer<typeof SeasonStructureSchema>

// Soundtrack track with YouTube link
export const SoundtrackTrackSchema = z.object({
  title: z.string(),
  artist: z.string(),
  youtubeUrl: z.string(),
  mood: z.string().nullable().optional().describe('e.g. "dark, brooding", "epic, triumphant"'),
})

export type SoundtrackTrack = z.infer<typeof SoundtrackTrackSchema>

// Inspiration item with description for tooltips
export const InspirationItemSchema = z.object({
  title: z.string(),
  description: z
    .string()
    .describe('1-2 sentence summary of what this is and why it inspires this world'),
})

export type InspirationItem = z.infer<typeof InspirationItemSchema>

export const KeyCharacterSchema = z.object({
  name: z.string(),
  role: z.string(),
  archetype: z.string(),
  motivation: z.string(),
  factionId: z.string().nullable(),
})

export type KeyCharacter = z.infer<typeof KeyCharacterSchema>

const StoryPlanBaseSchema = z.object({
  title: z.string(),
  genre: z.string(),
  tone: z.string(),
  centralQuestion: z.string(),
  worldRules: z.array(WorldRuleSchema),
  factions: z.array(FactionSchema),
  keyCharacters: z.array(KeyCharacterSchema),
  protagonist: z
    .object({
      name: z.string(),
      want: z.string(),
      need: z.string(),
      flaw: z.string(),
    })
    .nullable()
    .optional(),
  antagonist: z
    .object({
      name: z.string(),
      motivation: z.string(),
    })
    .nullable()
    .optional(),
  sequences: z.array(StoryArcSchema).nullable().optional(),
  executiveSummary: z
    .string()
    .nullable()
    .describe('2-3 sentence pitch summarizing the entire season arc'),

  // Season Structure (New)
  seasonStructure: SeasonStructureSchema.nullable().optional(),

  // Episode Roadmap (List of episodes)
  episodeRoadmap: EpisodeRoadmapSchema.nullable().optional(),

  // New World Premise fields
  worldDescription: z.string().min(100).nullable().optional().describe('World description must paint a vivid picture — min 100 chars. MUST weave in key cast and item/event/rule links in the prose using [Name][item-id], [Name][event-id], [Name][rule-id]. Minimum counts are in storyteller config (entityLinks). Only links in the narrative text count.'),
  plotTwists: z
    .array(z.string())
    .nullable()
    .optional()
    .describe('3 major plot twists that reshape the story'),

  // Enhanced inspirations with descriptions
  inspirations: z
    .object({
      books: z.array(InspirationItemSchema),
      movies: z.array(InspirationItemSchema),
      games: z.array(InspirationItemSchema),
    })
    .nullable()
    .optional(),

  // Legacy moodSoundtrack (backwards compat)
  moodSoundtrack: z.string().nullable().optional(),
  // New soundtracks array with YouTube links
  soundtracks: z.array(SoundtrackTrackSchema).nullable().optional(),

  imagePrompts: z.record(z.string()).nullable().optional(),

  moodImages: z.array(z.string()),

  themes: z.array(z.string()),

  // Items and Events
  items: z.array(ItemSchema).nullable().optional(),
  events: z.array(EventSchema).nullable().optional(),

  // Episode Poster / Combined Storyboard
  posterUrl: z.string().nullable().optional(),
  posterPrompt: z.string().nullable().optional(),

  // Wireframe / Storyboard
  storyboardUrl: z.string().nullable().optional(),
  storyboardPrompt: z.string().nullable().optional(),

  // UI / Permission State
  isLocked: z.boolean().nullable().optional(),
  lockedBy: z.string().nullable().optional(),
  lockedAt: z.string().nullable().optional(),

  // Legacy / Reducer compatibility fields
  styleReference: z.string().nullable().optional(),
  locations: z.array(z.record(z.unknown())).nullable().optional(),
})

/**
 * StoryPlan with the legacy self-nested `storyPlan` compatibility field.
 * Split from the base schema so the recursion is exactly one level deep and
 * TypeScript can infer the type (a self-referential literal is TS7022).
 */
export const StoryPlanSchema = StoryPlanBaseSchema.extend({
  storyPlan: StoryPlanBaseSchema.partial().nullable().optional(),
})
