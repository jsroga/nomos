/**
 * Zod Schemas for Structured Agent Output
 *
 * Provides validated, type-safe schemas for all agent responses.
 * Used with LangChain's withStructuredOutput for guaranteed schema compliance.
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
  object: z
    .string()
    .nullable()
    .describe('A SPECIFIC physical object with symbolic weight'),
  coreConcept: z.string().nullable().describe('Theme reinforcement - be philosophical'),
  attribute: z
    .string()
    .nullable()
    .describe('Sensory detail - smell, taste, texture, sound'),
  action: z
    .string()
    .nullable()
    .describe("ACTIVE VERB - not 'decides' but 'rips', 'slams', 'whispers'"),
  method: z.string().nullable().describe('The HOW reveals WHO - how they do it'),
  setting: z
    .string()
    .nullable()
    .describe('Environment as metaphor - the space reflects the psyche'),
  timeframe: z.string().nullable().describe('Specific time pressure'),
  motivation: z
    .string()
    .nullable()
    .describe('The ugly truth of WHY - the real motivation'),
  tone: z.string().nullable().describe('Specific atmosphere'),
})

export type MazurElements = z.infer<typeof MazurElementsSchema>

// ============================================
// BEAT SCHEMAS
// ============================================

export const WorldRuleSchema = z.object({
  category: z.enum(['Physics', 'Magic', 'Technology', 'Society', 'Politics', 'Economics']),
  rule: z.string().describe('The rule itself'),
  consequence: z.string().describe('What happens if this rule is broken or ignored'),
  exceptions: z.string().nullable().describe('Are there exceptions?'),
})

export const FactionSchema = z.object({
  id: z.string(),
  name: z.string(),
  ideology: z.string().describe('Core belief or philosophy'),
  goals: z.array(z.string()).describe('What they want'),
  resources: z.string().describe('What power/assets they control'),
  weaknesses: z.string().nullable(),
  rivals: z.array(z.string()).nullable(),
})

export type WorldRule = z.infer<typeof WorldRuleSchema>
export type Faction = z.infer<typeof FactionSchema>

export const BeatTypeSchema = z.enum([
  'setup',
  'complication',
  'revelation',
  'decision',
  'consequence',
  'conflict_escalation',
  'faction_move',
  'world_event'
])

export const BeatProposalSchema = z.object({
  logline: z
    .string()
    .min(10)
    .describe('2-3 sentences. Be specific. Name names. Include visceral details.'),
  content: z.string().nullable().describe('Full paragraph expanding on the beat'),
  beatType: BeatTypeSchema.describe('Type of beat in story structure'),
  charactersInvolved: z.array(z.string()).describe('Character names involved'),
  visualHook: z.string().describe('A SPECIFIC, MEMORABLE image'),
  emotionalShifts: z
    .array(z.object({
      characterName: z.string(),
      emotionalShift: z.string()
    }))
    .nullable()
    .describe('Character emotional transitions'),
  mazurElements: MazurElementsSchema.nullable(),
})

export type BeatProposal = z.infer<typeof BeatProposalSchema>

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
  consequences: z.array(z.string()).optional().describe('Ripple effects: World, Politics, Character'),
  // Advanced Roadmap Fields
  logline: z.string().optional().describe('Brief 1-sentence TV Guide style summary'),
  thematicFocus: z.string().optional().describe('The specific theme explored in this episode'),
  mainPlotBeat: z.string().optional().describe('A-Story: The core plot advancement'),
  bPlotBeat: z.string().optional().describe('B-Story: The character-specific subplot'),
  keyScenes: z.array(z.string()).optional().describe('Crucial moments or set pieces'),
  hook: z.string().optional().describe('Teaser/Cold Open: The opening grab'),
  cliffhanger: z.string().optional().describe('The ending hook to drive to the next episode'),
  reasoning: z.string().optional().describe('Showrunner notes: Why this episode is necessary here'),
  actStructure: z.string().optional().describe('e.g. "3 Acts" or "Teaser + 4 Acts"'),
})

export type StorySequence = z.infer<typeof StoryArcSchema>

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
  mood: z.string().optional().describe('e.g. "dark, brooding", "epic, triumphant"')
})

export type SoundtrackTrack = z.infer<typeof SoundtrackTrackSchema>

// Inspiration item with description for tooltips
export const InspirationItemSchema = z.object({
  title: z.string(),
  description: z.string().describe('1-2 sentence summary of what this is and why it inspires this world')
})

export type InspirationItem = z.infer<typeof InspirationItemSchema>

export const StoryPlanSchema = z.object({
  title: z.string(),
  genre: z.string(),
  tone: z.string(),
  centralQuestion: z.string(),
  worldRules: z.array(WorldRuleSchema),
  factions: z.array(FactionSchema),
  keyCharacters: z.array(z.object({
    name: z.string(),
    role: z.string(),
    archetype: z.string(),
    motivation: z.string(),
    factionId: z.string().nullable()
  })),
  protagonist: z.object({
    name: z.string(),
    want: z.string(),
    need: z.string(),
    flaw: z.string(),
  }).nullable(),
  antagonist: z.object({
    name: z.string(),
    motivation: z.string(),
  }).nullable(),
  sequences: z.array(StoryArcSchema).nullable(),
  executiveSummary: z.string().nullable().describe('2-3 sentence pitch summarizing the entire season arc'),

  // Season Structure (New)
  seasonStructure: SeasonStructureSchema.optional().nullable(),

  // New World Premise fields
  worldDescription: z.string().nullable(),
  plotTwists: z.array(z.string()).nullable().describe('3 major plot twists that reshape the story'),

  // Enhanced inspirations with descriptions
  inspirations: z.object({
    books: z.array(InspirationItemSchema),
    movies: z.array(InspirationItemSchema),
    games: z.array(InspirationItemSchema)
  }).nullable(),

  // Legacy moodSoundtrack (backwards compat)
  moodSoundtrack: z.string().nullable(),
  // New soundtracks array with YouTube links
  soundtracks: z.array(SoundtrackTrackSchema).nullable(),

  imagePrompts: z.record(z.string()).optional(),

  moodImages: z.array(z.string()),

  themes: z.array(z.string()),

  // Episode Poster / Combined Storyboard
  posterUrl: z.string().optional().nullable(),
  posterPrompt: z.string().optional().nullable(),

  // Wireframe / Storyboard
  storyboardUrl: z.string().optional().nullable(),
  storyboardPrompt: z.string().optional().nullable(),
})

// ============================================
// ACTION SCHEMAS (Comprehensive)
// ============================================

// --- Series Bible & World Building ---

export const UpdateSeriesBibleActionSchema = z.object({
  type: z.literal('UPDATE_SERIES_BIBLE'),
  payload: z.object({
    genre: z.string().nullable(),
    tone: z.string().nullable(),
    themes: z.array(z.string()).nullable(),
    worldRules: z.array(WorldRuleSchema).nullable(),
    factions: z.array(FactionSchema).nullable(),
    storyPlan: StoryPlanSchema.nullable(),
  }),
})

export const EpisodePremiseSchema = z.object({
  // Core identification
  title: z.string().describe('The episode title (e.g. Ozymandias)'),
  logline: z.string().describe('One sentence summary of the episode'),

  // Ozymandias Framework fields
  theHook: z.string().describe('Opening image/situation that immediately grabs attention and poses a question'),
  theTurn: z.string().describe('Midpoint/key event where the flaw causes a critical error or revelation'),
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
})

export type EpisodePremise = z.infer<typeof EpisodePremiseSchema>

export const UpdateEpisodePremiseActionSchema = z.object({
  type: z.literal('UPDATE_EPISODE_PREMISE'),
  payload: z.object({
    episodeId: z.string().nullable(),
    premise: EpisodePremiseSchema.partial(),
  }),
})

export const SetGenreToneActionSchema = z.object({
  type: z.literal('SET_GENRE_AND_TONE'),
  payload: z.object({
    genre: z.string(),
    tone: z.string(),
    styleReference: z.string().nullable(),
  }),
})

export const AddThemeActionSchema = z.object({
  type: z.literal('ADD_THEME'),
  payload: z.object({
    theme: z.string(),
    description: z.string().nullable(),
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
    visualRef: z.string().nullable(),
  }),
})

export const UpdateLocationActionSchema = z.object({
  type: z.literal('UPDATE_LOCATION'),
  payload: z.object({
    locationId: z.string(),
    updates: z.object({
      name: z.string().nullable(),
      description: z.string().nullable(),
      visualRef: z.string().nullable(),
      atmosphere: z.string().nullable(),
      significance: z.string().nullable(),
    }),
  }),
})

export const AddLoreEntryActionSchema = z.object({
  type: z.literal('ADD_LORE_ENTRY'),
  payload: z.object({
    title: z.string(),
    content: z.string(),
    tags: z.array(z.string()).nullable(),
  }),
})

export const DefineMagicSystemActionSchema = z.object({
  type: z.literal('DEFINE_MAGIC_SYSTEM'),
  payload: z.object({
    name: z.string(),
    rules: z.array(z.string()),
    costs: z.array(z.string()).nullable(),
  }),
})

// --- Character Development ---

export const CreateCharacterActionSchema = z.object({
  type: z.literal('CREATE_CHARACTER'),
  payload: z.object({
    name: z.string(),
    role: z.string(),
    description: z.string().nullable(),
    archetype: z.string().nullable(),
  }),
})

export const UpdateCharacterProfileActionSchema = z.object({
  type: z.literal('UPDATE_CHARACTER_PROFILE'),
  payload: z.object({
    characterId: z.string(), // or name if ID unknown
    updates: z.object({
      description: z.string().nullable(),
      traits: z.array(z.string()).nullable(),
      voice: z.string().nullable(),
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
    type: z.enum(['abstract', 'concrete']).nullable(),
  }),
})

export const AddCharacterSecretActionSchema = z.object({
  type: z.literal('ADD_CHARACTER_SECRET'),
  payload: z.object({
    characterId: z.string(),
    secret: z.string(),
    stakes: z.string().nullable(),
  }),
})

export const UpdateCharacterArcStatusActionSchema = z.object({
  type: z.literal('UPDATE_CHARACTER_ARC_STATUS'),
  payload: z.object({
    characterId: z.string(),
    status: z.string().describe('e.g., "Resisting the Call", "Dark Night of the Soul"'),
    progress: z.number().min(0).max(100).nullable(),
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
    visualNotes: z.string().nullable(),
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
    logline: z.string().nullable(),
    description: z.string().nullable(),
  }),
})

// Alias for backward compatibility if needed, but prefer UPDATE_BEAT_CONTENT
export const UpdateBeatActionSchema = z.object({
  type: z.literal('UPDATE_BEAT'),
  payload: z.object({
    beatId: z.string(),
    updates: z.object({
      logline: z.string().nullable(),
      content: z.string().nullable(),
      beatType: BeatTypeSchema.nullable(),
      charactersInvolved: z.array(z.string()).nullable(),
      visualHook: z.string().nullable(),
      emotionalShifts: z.array(z.object({
        characterName: z.string(),
        emotionalShift: z.string()
      })).nullable(),
      status: z.enum(['proposed', 'approved', 'rejected']).nullable(),
    }).describe('Partial updates to beat content'),
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
    reason: z.string().nullable(),
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
    action: z.string().nullable(),
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
    parenthetical: z.string().nullable(),
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
    author: z.string().nullable(),
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
    append: z.boolean().nullable()
  })
});

// --- Partial Bible Update Actions (Smart Merge) ---

export const MergeModeSchema = z.enum(['replace', 'merge', 'smart'])

export const UpdateWorldRulesActionSchema = z.object({
  type: z.literal('UPDATE_WORLD_RULES'),
  payload: z.object({
    rules: z.array(WorldRuleSchema),
    mergeMode: MergeModeSchema.describe('replace: overwrite all, merge: add new, smart: match by rule name and update/add')
  })
})

export const UpdateFactionsActionSchema = z.object({
  type: z.literal('UPDATE_FACTIONS'),
  payload: z.object({
    factions: z.array(FactionSchema),
    mergeMode: MergeModeSchema.describe('replace: overwrite all, merge: add new, smart: match by id/name and update/add')
  })
})

export const UpdateInspirationsActionSchema = z.object({
  type: z.literal('UPDATE_INSPIRATIONS'),
  payload: z.object({
    inspirations: z.object({
      books: z.array(InspirationItemSchema).nullable(),
      movies: z.array(InspirationItemSchema).nullable(),
      games: z.array(InspirationItemSchema).nullable()
    }),
    mergeMode: z.enum(['replace', 'merge']).nullable()
  })
})

export const UpdateWorldDescriptionActionSchema = z.object({
  type: z.literal('UPDATE_WORLD_DESCRIPTION'),
  payload: z.object({
    description: z.string()
  })
})

export const UpdateMoodSoundtrackActionSchema = z.object({
  type: z.literal('UPDATE_MOOD_SOUNDTRACK'),
  payload: z.object({
    moodSoundtrack: z.string().describe('Atmosphere description and soundtrack suggestion')
  })
})

export const UpdateSoundtracksActionSchema = z.object({
  type: z.literal('UPDATE_SOUNDTRACKS'),
  payload: z.object({
    soundtracks: z.array(SoundtrackTrackSchema),
    mergeMode: z.enum(['replace', 'merge']).nullable()
  })
})

export const UpdatePlotTwistsActionSchema = z.object({
  type: z.literal('UPDATE_PLOT_TWISTS'),
  payload: z.object({
    plotTwists: z.array(z.string()),
    mergeMode: z.enum(['replace', 'merge']).nullable()
  })
})

export const UpdateKeyCharactersActionSchema = z.object({
  type: z.literal('UPDATE_KEY_CHARACTERS'),
  payload: z.object({
    keyCharacters: z.array(z.object({
      name: z.string(),
      role: z.string(),
      archetype: z.string(),
      motivation: z.string(),
      factionId: z.string().nullable()
    })),
    mergeMode: MergeModeSchema.describe('replace: overwrite all, merge: add new, smart: match by name and update/add')
  })
})

export const UpdateEpisodeRoadmapActionSchema = z.object({
  type: z.literal('UPDATE_EPISODE_ROADMAP'),
  payload: z.object({
    sequences: z.array(StoryArcSchema),
    seasonStructure: SeasonStructureSchema.optional().nullable(),
    executiveSummary: z.string().nullable().optional(),
    mergeMode: z.enum(['replace', 'merge']).nullable()
  })
})

export const UpdateSeasonStructureActionSchema = z.object({
  type: z.literal('UPDATE_SEASON_STRUCTURE'),
  payload: z.object({
    seasonStructure: SeasonStructureSchema
  })
})

export const UpdateRoadmapSummaryActionSchema = z.object({
  type: z.literal('UPDATE_ROADMAP_SUMMARY'),
  payload: z.object({
    executiveSummary: z.string().describe('2-3 sentence pitch summarizing the entire season arc')
  })
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
  UpdateScriptContentActionSchema
])

export type AgentActionValidated = z.infer<typeof AgentActionSchema>

// ============================================
// QUESTION SCHEMAS
// ============================================

export const QuestionOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().nullable(),
  consequence: z.string().nullable(),
  recommended: z.boolean().nullable(),
})

export const QuestionUrgencySchema = z.enum(['blocking', 'important', 'optional'])
export const QuestionTypeSchema = z.enum([
  'single_choice',
  'multiple_choice',
  'free_text',
  'confirmation',
])

export const AgentQuestionSchema = z.object({
  id: z.string().nullable(),
  question: z.string().min(10),
  questionType: QuestionTypeSchema,
  options: z.array(QuestionOptionSchema).nullable(),
  context: z.string().nullable(),
  urgency: QuestionUrgencySchema,
  defaultOption: z.string().nullable(),
})

export type AgentQuestionValidated = z.infer<typeof AgentQuestionSchema>

// ============================================
// AGENT RESPONSE SCHEMAS
// ============================================

export const BaseAgentResponseSchema = z.object({
  message: z.string().describe('Your response to the user - be specific and concrete'),
  thinking: z.string().nullable().describe('Your reasoning process (for transparency)'),
  confidence: z.number().min(0).max(1).describe('Your confidence level 0-1'),
  nextAgent: z.string().nullable().describe('Suggest which agent should respond next'),
})

// Showrunner specific response
export const ShowrunnerResponseSchema = BaseAgentResponseSchema.extend({
  decision: z
    .enum([
      'PROPOSE_BEAT',
      'APPROVED',
      'REJECTED',
      'REVISION_NEEDED',
      'ADVANCE_PHASE',
      'NEEDS_INPUT',
      'DELEGATE',
      'UPDATE_SERIES_BIBLE',
      'DIRECT_ACTION'
    ])
    .nullable(),
  actions: z.array(AgentActionSchema),
  questions: z.array(AgentQuestionSchema),
})

export type ShowrunnerResponse = z.infer<typeof ShowrunnerResponseSchema>

// Plot Architect specific response
export const PlotArchitectResponseSchema = BaseAgentResponseSchema.extend({
  actions: z.array(AgentActionSchema), // Now supports all actions (e.g. UPDATE_BEAT)
})

export type PlotArchitectResponse = z.infer<typeof PlotArchitectResponseSchema>

// Character Psychology response
export const CharacterPsychologyResponseSchema = BaseAgentResponseSchema.extend({
  decision: z.enum(['APPROVED', 'REJECTED']),
  characterAnalysis: z
    .array(
      z.object({
        characterName: z.string(),
        wouldDoThis: z.boolean(),
        justification: z.string(),
        emotionalShift: z
          .object({
            from: z.string(),
            to: z.string(),
          })
          .nullable(),
        stressChange: z.number().min(-50).max(50).nullable(),
        selfTalk: z.string().nullable().describe('What they tell themselves'),
      })
    )
    .nullable(),
})

export type CharacterPsychologyResponse = z.infer<typeof CharacterPsychologyResponseSchema>

// Devil's Advocate response
export const DevilsAdvocateResponseSchema = BaseAgentResponseSchema.extend({
  verdict: z.enum(['PASS', 'CHALLENGE']),
  objection: z.string().nullable().optional().describe('The strongest objection to this beat'),
  alternative: z.string().nullable().optional().describe('An alternative that might be better'),
  attackVectors: z
    .array(
      z.enum([
        'plot_hole',
        'character_inconsistency',
        'cliche',
        'missed_opportunity',
        'coincidence',
        'stakes',
      ])
    )
    .nullable(),
})

export type DevilsAdvocateResponse = z.infer<typeof DevilsAdvocateResponseSchema>

// Consequence Tracker response
export const ConsequenceTrackerResponseSchema = BaseAgentResponseSchema.extend({
  newSetups: z
    .array(
      z.object({
        description: z.string(),
        needsPayoffBy: z
          .number()
          .nullable()
          .describe('Beat number by which this needs payoff'),
      })
    ),
  resolvedSetups: z
    .array(
      z.object({
        setupDescription: z.string(),
        howResolved: z.string(),
      })
    ),
  danglingWarnings: z.array(z.string()),
  knowledgeUpdates: z
    .array(
      z.object({
        characterName: z.string(),
        newKnowledge: z.string(),
      })
    ),
})

export type ConsequenceTrackerResponse = z.infer<typeof ConsequenceTrackerResponseSchema>

// Premise Architect response

export type StoryPlan = z.infer<typeof StoryPlanSchema>


export const EpisodePremiseArchitectResponseSchema = BaseAgentResponseSchema.extend({
  episodePremise: EpisodePremiseSchema.partial().nullable(),
  actions: z.array(AgentActionSchema),
})

export type EpisodePremiseArchitectResponse = z.infer<typeof EpisodePremiseArchitectResponseSchema>

export const PremiseArchitectResponseSchema = BaseAgentResponseSchema.extend({
  actions: z.array(AgentActionSchema),
  storyPlan: StoryPlanSchema.nullable(),
})

export type PremiseArchitectResponse = z.infer<typeof PremiseArchitectResponseSchema>

// Writer response
export const WriterResponseSchema = BaseAgentResponseSchema.extend({
  scriptContent: z.string().describe('The screenplay content for this beat'),
  beatId: z.string().nullable(),
  sceneHeading: z.string().nullable().describe('INT./EXT. LOCATION - TIME'),
  actions: z.array(AgentActionSchema)
})

export type WriterResponse = z.infer<typeof WriterResponseSchema>

// Script Editor response (Evaluator-Optimizer pattern)
export const ScriptEditorResponseSchema = BaseAgentResponseSchema.extend({
  verdict: z.enum(['PASS', 'REVISE']).describe('Whether the script passes quality review or needs revision'),
  feedback: z.array(z.string()).describe('Specific feedback items for the writer'),
  improvements: z.array(z.object({
    category: z.enum([
      'dialogue',
      'visual_hook',
      'pacing',
      'format',
      'character_voice',
      'action_lines',
      'subtext'
    ]).describe('Category of improvement'),
    issue: z.string().describe('What is wrong'),
    suggestion: z.string().describe('How to fix it'),
    severity: z.enum(['critical', 'important', 'minor']).describe('How important is this fix'),
  })).describe('Detailed improvement suggestions'),
  overallQuality: z.number().min(0).max(100).describe('Overall script quality score 0-100'),
  strengths: z.array(z.string()).describe('What the script does well'),
})

export type ScriptEditorResponse = z.infer<typeof ScriptEditorResponseSchema>

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Safely parse an agent response with fallback
 */
export function parseAgentResponse<T>(
  content: string,
  schema: z.ZodType<T>,
  fallbackMessage: string = 'Failed to parse response'
): T | null {
  try {
    // Try to extract JSON from content
    let jsonStr = content
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim()
    }

    // Attempt 1: Direct Parse
    try {
      const parsed = JSON.parse(jsonStr)
      return schema.parse(parsed)
    } catch (e) {
      // Continue to heuristics
    }

    // Attempt 2: Clean Stringified JSON (e.g. "{\"key\": \"value\"}")
    if (jsonStr.startsWith('"') && jsonStr.endsWith('"')) {
      try {
        const unquoted = JSON.parse(jsonStr)
        if (typeof unquoted === 'string') {
          const parsed = JSON.parse(unquoted)
          return schema.parse(parsed)
        }
      } catch (e) {
        // Continue
      }
    }

    // Attempt 3: Aggressive cleanup of escaped quotes (common LLM error)
    // If the string contains \" but is not wrapped in quotes, it might be malformed escaping
    try {
      const cleaned = jsonStr.replace(/\\"/g, '"').replace(/\\n/g, '\n')
      const parsed = JSON.parse(cleaned)
      return schema.parse(parsed)
    } catch (e) {
      // Continue
    }

    // Attempt 4: Loose Substring Extraction (for mixed text without code blocks)
    // Locates the first '{' and the last '}' and attempts to parse the content between them
    try {
      const firstBrace = content.indexOf('{')
      const lastBrace = content.lastIndexOf('}')
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const potentialJson = content.substring(firstBrace, lastBrace + 1)
        const parsed = JSON.parse(potentialJson)
        return schema.parse(parsed)
      }
    } catch (e) {
      // Continue
    }

    console.warn('All JSON parse attempts failed for content:', content.substring(0, 100))
    return null
  } catch (error) {
    console.warn('Schema validation failed:', error)
    return null
  }
}

/**
 * Create a fallback response when parsing fails
 */
export function createFallbackResponse(
  content: string,
  agentName: string
): {
  message: string
  actions: []
  confidence: number
} {
  return {
    message: content,
    actions: [],
    confidence: 0.5,
  }
}
