/**
 * Zod Schemas for Structured Agent Output
 *
 * Provides validated, type-safe schemas for all agent responses.
 * Used with Mastra agents and structured output for guaranteed schema compliance.
 */

import { z } from 'zod'

// ============================================
// MAZUR ELEMENTS SCHEMA
// ============================================

export const MazurElementsSchema = z.object({
  character: z
    .string()
    .nullable()
    .describe('Specific trait revealed - be harsh, be honest about who they really are'),
  object: z.string().nullable().describe('A SPECIFIC physical object with symbolic weight'),
  coreConcept: z.string().nullable().describe('Theme reinforcement - be philosophical'),
  attribute: z.string().nullable().describe('Sensory detail - smell, taste, texture, sound'),
  action: z
    .string()
    .nullable()
    .describe('ACTIVE VERB - not \'decides\' but \'rips\', \'slams\', \'whispers\''),
  method: z.string().nullable().describe('The HOW reveals WHO - how they do it'),
  setting: z
    .string()
    .nullable()
    .describe('Environment as metaphor - the space reflects the psyche'),
  timeframe: z.string().nullable().describe('Specific time pressure'),
  motivation: z.string().nullable().describe('The ugly truth of WHY - the real motivation'),
  tone: z.string().nullable().describe('Specific atmosphere'),
})

// ============================================
// BEAT SCHEMAS
// ============================================

export const WorldRuleSchema = z.object({
  category: z.enum(['Physics', 'Magic', 'Technology', 'Society', 'Politics', 'Economics']),
  rule: z.string().min(15).describe('The rule itself — be specific, not vague. Min 15 chars.'),
  consequence: z.string().min(15).describe('What happens if this rule is broken or ignored — concrete consequence. Min 15 chars.'),
  exceptions: z.string().nullable().optional().describe('Are there exceptions?'),
})

export const FactionSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  description: z.string().min(30).describe('Brief summary of the faction — be specific about what makes them unique. Min 30 chars.'),
  ideology: z.string().min(10).describe('Core belief or philosophy — not just "power" or "justice". Min 10 chars.'),
  goals: z.array(z.string().min(10)).describe('What they want — each goal must be specific'),
  resources: z.string().min(10).describe('What power/assets they control'),
  weaknesses: z.string().min(10).nullable().optional(),
  rivals: z.array(z.string()).nullable().optional(),
})

export type WorldRule = z.infer<typeof WorldRuleSchema>
export type Faction = z.infer<typeof FactionSchema>

export const ItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  description: z.string().min(20).describe('Description of the item, its history, or its unique properties. Min 20 chars.'),
})

export const EventSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  description: z.string().min(20).describe('Description of the event, its impact, and its legacy. Min 20 chars.'),
})

export type Item = z.infer<typeof ItemSchema>
export type StoryEvent = z.infer<typeof EventSchema>

export const BeatTypeSchema = z.enum([
  'setup',
  'complication',
  'revelation',
  'decision',
  'consequence',
  'conflict_escalation',
  'faction_move',
  'world_event',
])

export const BeatProposalSchema = z.object({
  logline: z
    .string()
    .min(30)
    .describe('2-3 sentences. Be specific. Name names. Include visceral details. Min 30 chars.'),
  content: z.string().min(50).nullable().optional().describe('Full paragraph expanding on the beat. Min 50 chars when provided.'),
  beatType: BeatTypeSchema.nullable().optional().describe('Type of beat in story structure'),
  charactersInvolved: z
    .array(z.string())
    .nullable()
    .optional()
    .describe('Character names involved'),
  visualHook: z.string().min(15).nullable().optional().describe('A SPECIFIC, MEMORABLE image. Min 15 chars — no generic descriptions.'),
  emotionalShifts: z
    .array(
      z.object({
        characterName: z.string(),
        emotionalShift: z.string(),
      })
    )
    .nullable()
    .optional()
    .describe('Character emotional transitions'),
  mazurElements: MazurElementsSchema.nullable().optional(),
})

// ============================================
// STORY STRUCTURE SCHEMAS (Moved up for dependencies)
// ============================================

// ============================================
// STORY STRUCTURE SCHEMAS (Moved up for dependencies)
// ============================================

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

// ============================================
// ACTION SCHEMAS (Comprehensive)
// ============================================

// --- Series Bible & World Building ---

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

// --- Character Development ---

export const CreateCharacterActionSchema = z.object({
  type: z.literal('CREATE_CHARACTER'),
  payload: z.object({
    name: z.string().min(2),
    role: z.string().min(3),
    description: z.string().min(50).nullable().optional().describe('Min 50 chars — include physical details AND personality contradiction.'),
    archetype: z.string().min(3).nullable().optional(),
  }),
})

export const UpdateCharacterProfileActionSchema = z.object({
  type: z.literal('UPDATE_CHARACTER_PROFILE'),
  payload: z.object({
    characterId: z.string(), // or name if ID unknown
    updates: z.object({
      description: z.string().nullable().optional(),
      traits: z.array(z.string()).nullable().optional(),
      voice: z.string().nullable().optional(),
    }),
  }),
})

export const UpdateCharacterRelationshipActionSchema = z.object({
  type: z.literal('UPDATE_CHARACTER_RELATIONSHIP'),
  payload: z.object({
    character1: z.string(),
    character2: z.string(),
    relationshipType: z.string(),
    dynamic: z.string().describe('How they interact now'),
  }),
})

export const SetCharacterGoalActionSchema = z.object({
  type: z.literal('SET_CHARACTER_GOAL'),
  payload: z.object({
    characterId: z.string(),
    goal: z.string(),
    type: z.enum(['abstract', 'concrete']).nullable().optional(),
  }),
})

export const AddCharacterSecretActionSchema = z.object({
  type: z.literal('ADD_CHARACTER_SECRET'),
  payload: z.object({
    characterId: z.string(),
    secret: z.string(),
    stakes: z.string().nullable().optional(),
  }),
})

export const UpdateCharacterArcStatusActionSchema = z.object({
  type: z.literal('UPDATE_CHARACTER_ARC_STATUS'),
  payload: z.object({
    characterId: z.string(),
    status: z.string().describe('e.g., "Resisting the Call", "Dark Night of the Soul"'),
    progress: z.number().min(0).max(100).nullable().optional(),
  }),
})

export const ArchiveCharacterActionSchema = z.object({
  type: z.literal('ARCHIVE_CHARACTER'),
  payload: z.object({
    characterId: z.string(),
    reason: z.string(),
  }),
})

export const CastCharacterActionSchema = z.object({
  type: z.literal('CAST_CHARACTER'),
  payload: z.object({
    characterId: z.string(),
    actorArchetype: z.string(),
    visualNotes: z.string().nullable().optional(),
  }),
})

// --- Beat Board & Plotting ---

export const CreateBeatActionSchema = z.object({
  type: z.literal('CREATE_BEAT'),
  payload: BeatProposalSchema,
})

export const UpdateBeatContentActionSchema = z.object({
  type: z.literal('UPDATE_BEAT_CONTENT'),
  payload: z.object({
    beatId: z.string(),
    logline: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
  }),
})

// Alias for backward compatibility if needed, but prefer UPDATE_BEAT_CONTENT
export const UpdateBeatActionSchema = z.object({
  type: z.literal('UPDATE_BEAT'),
  payload: z.object({
    beatId: z.string(),
    updates: z
      .object({
        logline: z.string().nullable().optional(),
        content: z.string().nullable().optional(),
        beatType: BeatTypeSchema.nullable().optional(),
        charactersInvolved: z.array(z.string()).nullable().optional(),
        visualHook: z.string().nullable().optional(),
        emotionalShifts: z
          .array(
            z.object({
              characterName: z.string(),
              emotionalShift: z.string(),
            })
          )
          .nullable()
          .optional(),
        status: z.enum(['proposed', 'approved', 'rejected']).nullable().optional(),
      })
      .describe('Partial updates to beat content'),
  }),
})

export const ReorderBeatActionSchema = z.object({
  type: z.literal('REORDER_BEAT'),
  payload: z.object({
    beatId: z.string(),
    newIndex: z.number(),
  }),
})

export const DeleteBeatActionSchema = z.object({
  type: z.literal('DELETE_BEAT'),
  payload: z.object({
    beatId: z.string(),
    reason: z.string().nullable().optional(),
  }),
})

export const SplitBeatActionSchema = z.object({
  type: z.literal('SPLIT_BEAT'),
  payload: z.object({
    beatId: z.string(),
    splitPoint: z.string().describe('Where to split'),
  }),
})

export const MergeBeatsActionSchema = z.object({
  type: z.literal('MERGE_BEATS'),
  payload: z.object({
    beatIds: z.array(z.string()),
    mergedLogline: z.string(),
  }),
})

export const LinkBeatsActionSchema = z.object({
  type: z.literal('LINK_BEATS'),
  payload: z.object({
    sourceBeatId: z.string(),
    targetBeatId: z.string(),
    relationType: z.enum(['causes', 'mirrors', 'contrasts', 'setups']),
  }),
})

export const TagBeatActionSchema = z.object({
  type: z.literal('TAG_BEAT'),
  payload: z.object({
    beatId: z.string(),
    tag: z.string(),
  }),
})

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

// --- Unified Action Union ---

export const AgentActionSchema = z.discriminatedUnion('type', [
  // Bible
  UpdateSeriesBibleActionSchema,
  UpdateEpisodePremiseActionSchema,
  SetGenreToneActionSchema,
  AddThemeActionSchema,
  RemoveThemeActionSchema,
  CreateLocationActionSchema,
  UpdateLocationActionSchema,
  AddLoreEntryActionSchema,
  DefineMagicSystemActionSchema,
  // Partial Bible Updates (Smart Merge)
  UpdateWorldRulesActionSchema,
  UpdateFactionsActionSchema,
  UpdateInspirationsActionSchema,
  UpdateWorldDescriptionActionSchema,
  UpdateMoodSoundtrackActionSchema,
  UpdateSoundtracksActionSchema,
  UpdatePlotTwistsActionSchema,
  UpdateKeyCharactersActionSchema,
  UpdateEpisodeRoadmapActionSchema,
  UpdateSeasonStructureActionSchema,
  UpdateRoadmapSummaryActionSchema,
  // Character
  CreateCharacterActionSchema,
  UpdateCharacterProfileActionSchema,
  UpdateCharacterRelationshipActionSchema,
  SetCharacterGoalActionSchema,
  AddCharacterSecretActionSchema,
  UpdateCharacterArcStatusActionSchema,
  ArchiveCharacterActionSchema,
  CastCharacterActionSchema,
  // Beats
  CreateBeatActionSchema,
  UpdateBeatContentActionSchema,
  UpdateBeatActionSchema, // Legacy/Fallback
  ReorderBeatActionSchema,
  DeleteBeatActionSchema,
  SplitBeatActionSchema,
  MergeBeatsActionSchema,
  LinkBeatsActionSchema,
  TagBeatActionSchema,
  // Script
  CreateSceneActionSchema,
  UpdateSceneActionSchema,
  UpdateDialogueActionSchema,
  ReorderSceneActionSchema,
  DeleteSceneActionSchema,
  AddSceneNoteActionSchema,
  SetSceneMoodActionSchema,
  UpdateScriptContentActionSchema,
])

// ============================================
// AGENT RESPONSE SCHEMAS
// ============================================

export const BaseAgentResponseSchema = z.object({
  message: z.string().describe('Your response to the user - be specific and concrete'),
  thinking: z.string().nullable().optional().describe('Your reasoning process (for transparency)'),
  confidence: z.number().min(0).max(1).nullable().optional().describe('Your confidence level 0-1'),
  nextAgent: z.string().nullable().optional().describe('Suggest which agent should respond next'),
})

// Premise Architect response

export type StoryPlan = z.infer<typeof StoryPlanSchema>

export const PremiseArchitectResponseSchema = BaseAgentResponseSchema.extend({
  actions: z.array(AgentActionSchema).nullable().optional(),
  storyPlan: StoryPlanSchema.nullable().optional(),
})

type PremiseArchitectResponse = z.infer<typeof PremiseArchitectResponseSchema>
