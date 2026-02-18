import { z } from 'zod'

// ==========================================
// MECHANIC SCHEMAS
// ==========================================

export const GameResourceSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  type: z.enum(['currency', 'material', 'stat', 'abstract']),
  initialValue: z.number().default(0),
  maxValue: z.number().optional(),
  minValue: z.number().optional(),
  visibility: z.enum(['public', 'hidden', 'debug']).default('public'),
})

export const MechanicTransformerSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['converter', 'generator', 'sink', 'gate']),
  inputs: z.array(
    z.object({
      resourceId: z.string().uuid(),
      amount: z.number().min(0),
      consume: z.boolean().default(true),
    })
  ),
  outputs: z.array(
    z.object({
      resourceId: z.string().uuid(),
      amount: z.number().min(0),
      probability: z.number().min(0).max(1).default(1),
    })
  ),
  conditions: z
    .array(
      z.object({
        resourceId: z.string().uuid(),
        operator: z.enum(['gt', 'gte', 'lt', 'lte', 'eq']),
        value: z.number(),
      })
    )
    .optional(),
})

export const GameMechanicSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string(),
  type: z.enum(['core', 'meta', 'social', 'monetization']),
  transformers: z.array(MechanicTransformerSchema),
  playerInteraction: z.enum(['active', 'passive', 'automated']).default('active'),
  complexityScore: z.number().min(1).max(10).optional(),
})

// ==========================================
// LOOP SCHEMAS
// ==========================================

export const LoopNodeSchema = z.object({
  id: z.string().uuid(),
  mechanicId: z.string().uuid(),
  position: z.object({ x: z.number(), y: z.number() }).optional(),
  label: z.string().optional(),
})

export const LoopEdgeSchema = z.object({
  id: z.string().uuid(),
  sourceNodeId: z.string().uuid(),
  targetNodeId: z.string().uuid(),
  resourceFlow: z.string().uuid().optional(), // Resource ID being transferred
  weight: z.number().default(1),
  label: z.string().optional(),
})

export const GameLoopTypeSchema = z.enum([
  'compulsion', // Short-term (seconds)
  'core', // Medium-term (minutes)
  'meta', // Long-term (days/weeks)
  'social', // Multiplayer interactions
  'monetization', // Conversion flows
])

export const GameLoopSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  name: z.string().min(1),
  type: GameLoopTypeSchema,
  nodes: z.array(LoopNodeSchema),
  edges: z.array(LoopEdgeSchema),
  resources: z.array(GameResourceSchema),
  metrics: z
    .object({
      returnOnInvestment: z.number().optional(), // Efficiency
      timeToComplete: z.number().optional(), // Seconds
      frictionScore: z.number().optional(), // 0-1
    })
    .optional(),
  validationState: z.enum(['draft', 'valid', 'broken']).default('draft'),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
})

// ==========================================
// AGENT INTERACTION SCHEMAS
// ==========================================

const AnalyzeBalanceInputSchema = z.object({
  loopId: z.string().uuid(),
  targetAudience: z.enum(['casual', 'midcore', 'hardcore']),
  durationSeconds: z.number().default(600), // Simulation time
})

const SuggestProgressionInputSchema = z.object({
  currentLoop: GameLoopSchema,
  expansionDirection: z.enum(['depth', 'breadth', 'complexity']),
  theme: z.string().optional(),
})

// ==========================================
// BALANCE CONFIG SCHEMAS
// ==========================================

export const ResourceRateSchema = z.object({
  resourceId: z.string().uuid(),
  rate: z.number().describe('Units per second'),
  variability: z.number().min(0).max(1).default(0).describe('Random variance factor'),
  cooldown: z.number().optional().describe('Seconds between activations'),
})

export const BalanceConstraintSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['min_value', 'max_value', 'ratio', 'rate_cap']),
  resourceId: z.string().uuid(),
  value: z.number(),
  comparisonResourceId: z.string().uuid().optional().describe('For ratio constraints'),
})

export const BalanceConfigSchema = z.object({
  id: z.string().uuid(),
  loopId: z.string().uuid(),
  name: z.string().min(1),
  resources: z.array(GameResourceSchema),
  generationRates: z.array(ResourceRateSchema).describe('How resources are generated'),
  consumptionRates: z.array(ResourceRateSchema).describe('How resources are consumed'),
  constraints: z.array(BalanceConstraintSchema).optional(),
  targetSessionLength: z.number().default(1800).describe('Target session length in seconds'),
  difficultyScale: z.number().min(0.1).max(3).default(1).describe('Global difficulty multiplier'),
  economyType: z.enum(['inflationary', 'deflationary', 'stable']).default('stable'),
})

// ==========================================
// AGENT INTERACTION SCHEMAS
// ==========================================

export const IdentifyCoreLoopInputSchema = z.object({
  mechanics: z.array(GameMechanicSchema),
  genre: z.string().describe('Game genre (e.g., roguelike, farming sim)'),
  targetAudience: z.enum(['casual', 'midcore', 'hardcore']),
})

export const IdentifyCoreLoopOutputSchema = z.object({
  coreLoop: z.object({
    name: z.string(),
    type: z.enum(['compulsion', 'core', 'meta', 'social', 'monetization']),
    mechanics: z.array(z.string()).describe('Names or IDs of mechanics in this loop'),
    cycleDuration: z.object({
      min: z.number(),
      max: z.number(),
      unit: z.enum(['seconds', 'minutes', 'hours']),
    }),
    psychologicalHook: z.string().describe('Why this loop is engaging'),
  }),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
})

export const AnalyzeBalanceOutputSchema = z.object({
  overallScore: z.number().min(0).max(10),
  economyHealth: z.enum(['healthy', 'inflationary', 'deflationary', 'broken']),
  issues: z.array(
    z.object({
      severity: z.enum(['critical', 'warning', 'suggestion']),
      type: z.enum([
        'reward_imbalance',
        'effort_mismatch',
        'loop_break',
        'dead_end',
        'grind_detected',
        'resource_flood',
        'resource_drought',
      ]),
      description: z.string(),
      affectedMechanics: z.array(z.string()),
      suggestedFix: z.string().optional(),
    })
  ),
  recommendations: z.array(z.string()),
  simulationResults: z
    .object({
      timeToFirstReward: z.number().describe('Seconds'),
      resourcesAtSessionEnd: z.record(z.string(), z.number()),
      playerSatisfactionEstimate: z.number().min(0).max(10),
    })
    .optional(),
})

export const SuggestProgressionOutputSchema = z.object({
  suggestions: z.array(
    z.object({
      id: z.string(),
      type: z.enum(['new_mechanic', 'new_loop', 'balance_tweak', 'progression_gate']),
      title: z.string(),
      description: z.string(),
      impact: z.object({
        engagement: z.number().min(-5).max(5),
        complexity: z.number().min(-5).max(5),
        monetization: z.number().min(-5).max(5),
      }),
      implementation: z.string().describe('How to implement this suggestion'),
      priority: z.enum(['high', 'medium', 'low']),
    })
  ),
  overallDirection: z.string().describe('Strategic advice for progression'),
})

export const GameDesignInputSchema = z.object({
  projectId: z.string().uuid(),
  goal: z.string().describe('What the agent should achieve'),
  context: z
    .object({
      existingLoops: z.array(GameLoopSchema).optional(),
      genre: z.string().optional(),
      targetAudience: z.enum(['casual', 'midcore', 'hardcore']).optional(),
      theme: z.string().optional(),
      referenceGames: z.array(z.string()).optional(),
    })
    .optional(),
  constraints: z
    .object({
      maxMechanics: z.number().optional(),
      requiredFeatures: z.array(z.string()).optional(),
      prohibitedFeatures: z.array(z.string()).optional(),
    })
    .optional(),
})

export type GameLoop = z.infer<typeof GameLoopSchema>
export type GameMechanic = z.infer<typeof GameMechanicSchema>
type GameResource = z.infer<typeof GameResourceSchema>
type BalanceConfig = z.infer<typeof BalanceConfigSchema>
type GameDesignInput = z.infer<typeof GameDesignInputSchema>
type IdentifyCoreLoopOutput = z.infer<typeof IdentifyCoreLoopOutputSchema>
type AnalyzeBalanceOutput = z.infer<typeof AnalyzeBalanceOutputSchema>
type SuggestProgressionOutput = z.infer<typeof SuggestProgressionOutputSchema>

// ==========================================
// HAUTE GAME FRAMEWORK SCHEMAS (Klei + CDPR + Kojima)
// ==========================================

// --- Atomic Loom (Klei: Systems First) ---
export const AtomicVerbSchema = z.object({
  id: z.string(),
  name: z.string().describe('Action name (burn, freeze, feed, break)'),
  targets: z.array(z.string()).describe('What noun types this can affect'),
  effects: z.array(z.string()).describe('State changes this verb causes'),
  playerInitiated: z.boolean().default(true),
})

export const AtomicNounSchema = z.object({
  id: z.string(),
  name: z.string().describe('Entity name (wood, creature, player)'),
  properties: z.array(z.string()).describe('Inherent traits (flammable, alive, solid)'),
  states: z.array(z.string()).describe('Possible states (burning, frozen, dead)'),
  category: z.enum(['resource', 'entity', 'environment', 'abstract']),
})

export const InteractionRuleSchema = z.object({
  id: z.string(),
  verb: z.string().describe('The action being performed'),
  noun: z.string().describe('The target of the action'),
  result: z.string().describe('Primary outcome'),
  emergent: z.array(z.string()).describe('Unintended but valid combinations'),
  chainable: z.boolean().default(false).describe('Can trigger other rules'),
})

export const AtomicLoomOutputSchema = z.object({
  verbs: z.array(AtomicVerbSchema),
  nouns: z.array(AtomicNounSchema),
  rules: z.array(InteractionRuleSchema),
  emergentCombos: z.array(
    z.object({
      chain: z.array(z.string()).describe('Sequence of verb+noun'),
      outcome: z.string(),
      discoveryDifficulty: z.enum(['obvious', 'hidden', 'secret']),
    })
  ),
  systemEleganceScore: z.number().min(0).max(10).describe('Few rules, many outcomes'),
})

// --- Memory Keeper (CDPR: World Remembers) ---
export const MemoryEventSchema = z.object({
  id: z.string(),
  type: z.enum(['action', 'dialogue', 'discovery', 'combat', 'choice']),
  description: z.string(),
  witnesses: z.array(z.string()).describe('NPC IDs who observed'),
  decayDays: z.number().describe('How many in-game days before forgotten'),
  propagationRadius: z.enum(['local', 'regional', 'global']),
})

export const RumorSchema = z.object({
  id: z.string(),
  sourceEvent: z.string().describe('Original event ID'),
  currentForm: z.string().describe('How the rumor is currently told'),
  distortionLevel: z.number().min(0).max(1).describe('How much truth remains'),
  spreadRate: z.enum(['slow', 'medium', 'fast', 'viral']),
  factionReach: z.array(z.string()).describe('Which factions have heard'),
})

export const MemoryKeeperOutputSchema = z.object({
  events: z.array(MemoryEventSchema),
  rumors: z.array(RumorSchema),
  questTriggers: z.array(
    z.object({
      condition: z.string().describe('What triggers the quest'),
      questSeed: z.string().describe('Brief quest concept'),
      delay: z.enum(['immediate', 'short', 'long', 'very_long']),
    })
  ),
  worldMemoryDepth: z.number().min(0).max(10),
})

// --- Grey Palette (CDPR: Moral Complexity) ---
export const MoralChoiceSchema = z.object({
  id: z.string(),
  situation: z.string().describe('The dilemma presented'),
  options: z.array(
    z.object({
      id: z.string(),
      action: z.string(),
      immediateGain: z.string().optional(),
      hiddenCost: z.string().optional(),
      factionImpact: z.record(z.string(), z.number().min(-10).max(10)),
      moralWeight: z.enum(['light', 'moderate', 'heavy', 'defining']),
    })
  ),
  noGoodChoice: z.boolean().describe('True if all options have significant cost'),
  delayedConsequence: z.boolean().describe('True if impact revealed later'),
})

export const ConsequenceChainSchema = z.object({
  triggerId: z.string().describe('Choice that started this'),
  immediate: z.array(z.string()).describe('Happens right away'),
  shortTerm: z.array(z.string()).describe('Within same session'),
  longTerm: z.array(z.string()).describe('Hours later'),
  permanent: z.array(z.string()).describe('Changes world state forever'),
})

export const GreyPaletteOutputSchema = z.object({
  choices: z.array(MoralChoiceSchema),
  consequences: z.array(ConsequenceChainSchema),
  factionTensions: z.array(
    z.object({
      factionA: z.string(),
      factionB: z.string(),
      tension: z.enum(['allied', 'neutral', 'suspicious', 'hostile', 'war']),
      playerCanInfluence: z.boolean(),
    })
  ),
  moralComplexityScore: z.number().min(0).max(10),
})

// --- Strand Weaver (Kojima: Connection) ---
export const TraceTypeSchema = z.object({
  id: z.string(),
  name: z.string().describe('What players leave behind'),
  persistence: z.enum(['session', 'permanent', 'decaying']),
  visibility: z.enum(['always', 'proximity', 'special_condition']),
  interactable: z.boolean().describe('Can other players use/modify'),
  examples: z.array(z.string()),
})

export const LegacyElementSchema = z.object({
  id: z.string(),
  sourceType: z.enum(['death', 'abandonment', 'achievement', 'gift']),
  element: z.string().describe('What persists'),
  transformRules: z.string().describe('How it changes over time'),
  inheritanceChance: z.number().min(0).max(1),
})

export const StrandWeaverOutputSchema = z.object({
  traceTypes: z.array(TraceTypeSchema),
  legacyElements: z.array(LegacyElementSchema),
  sharedChallenges: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      contributionType: z.enum(['additive', 'competitive', 'collaborative']),
      reward: z.string(),
    })
  ),
  connectionMeaningScore: z.number().min(0).max(10),
})

// --- Silent Teacher (Klei: Discovery) ---
export const LearningScenarioSchema = z.object({
  id: z.string(),
  mechanicToTeach: z.string(),
  setupDescription: z.string().describe('How the scenario is arranged'),
  failureMode: z.string().describe('What happens if player fails'),
  failureSeverity: z.enum(['trivial', 'setback', 'significant']),
  successIndicator: z.string().describe('How player knows they succeeded'),
  explicitInstruction: z.literal(false).describe('Never tell, always show'),
})

export const SilentTeacherOutputSchema = z.object({
  scenarios: z.array(LearningScenarioSchema),
  breadcrumbs: z.array(
    z.object({
      hint: z.string().describe('Subtle environmental hint'),
      mechanic: z.string(),
      obviousness: z.enum(['subtle', 'moderate', 'clear']),
    })
  ),
  safeFailureZones: z.array(
    z.object({
      location: z.string(),
      purpose: z.string(),
      resetCost: z.enum(['free', 'minor', 'moderate']),
    })
  ),
  discoveryRespectScore: z.number().min(0).max(10),
})

// --- Mundane Poet (Kojima: Meaningful Routine) ---
export const RitualDesignSchema = z.object({
  id: z.string(),
  baseMechanic: z.string().describe('The "boring" action being elevated'),
  ritualName: z.string().describe('What it becomes'),
  steps: z.array(z.string()).describe('The deliberate process'),
  emotionalPayoff: z.string().describe('What player feels'),
  frequency: z.enum(['constant', 'frequent', 'occasional', 'rare']),
  skipPenalty: z.string().optional().describe('Cost of rushing'),
})

export const MundanePoetOutputSchema = z.object({
  rituals: z.array(RitualDesignSchema),
  frictionPoints: z.array(
    z.object({
      action: z.string(),
      friction: z.string().describe('Intentional slowness'),
      purpose: z.string().describe('Why this friction matters'),
    })
  ),
  quietMoments: z.array(
    z.object({
      trigger: z.string(),
      duration: z.string(),
      atmosphere: z.string(),
    })
  ),
  mundaneBeautyScore: z.number().min(0).max(10),
})

// --- Combined Haute Game Output ---
export const HauteGameDesignSchema = z.object({
  atomicSystems: AtomicLoomOutputSchema.optional(),
  worldMemory: MemoryKeeperOutputSchema.optional(),
  moralChoices: GreyPaletteOutputSchema.optional(),
  strandConnections: StrandWeaverOutputSchema.optional(),
  implicitLearning: SilentTeacherOutputSchema.optional(),
  meaningfulMundane: MundanePoetOutputSchema.optional(),

  // Overall scores
  overallScores: z.object({
    systemElegance: z.number().min(0).max(10),
    narrativeIntegration: z.number().min(0).max(10),
    connectionMeaning: z.number().min(0).max(10),
    discoveryRespect: z.number().min(0).max(10),
    mundaneBeauty: z.number().min(0).max(10),
    cohesion: z.number().min(0).max(10),
  }),

  // The ultimate test
  wouldPlayersTellStories: z.boolean(),
  storyPotentialExamples: z.array(z.string()).describe('Example emergent stories'),
})

// Export Haute Game types
type AtomicVerb = z.infer<typeof AtomicVerbSchema>
type AtomicNoun = z.infer<typeof AtomicNounSchema>
type InteractionRule = z.infer<typeof InteractionRuleSchema>
type AtomicLoomOutput = z.infer<typeof AtomicLoomOutputSchema>
type MemoryKeeperOutput = z.infer<typeof MemoryKeeperOutputSchema>
type GreyPaletteOutput = z.infer<typeof GreyPaletteOutputSchema>
type StrandWeaverOutput = z.infer<typeof StrandWeaverOutputSchema>
type SilentTeacherOutput = z.infer<typeof SilentTeacherOutputSchema>
type MundanePoetOutput = z.infer<typeof MundanePoetOutputSchema>
type HauteGameDesign = z.infer<typeof HauteGameDesignSchema>
