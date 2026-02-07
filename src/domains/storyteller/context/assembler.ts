/**
 * Context Assembler
 *
 * Builds optimized context for each agent by combining:
 * - Series Bible
 * - Character States
 * - Beat History
 * - Writing Laws
 * - Current Phase Context
 * - RAG-retrieved relevant history
 */

import { WritersRoomState, BeatCard, CharacterState, Phase } from '../types'
import { getWritingLawsContext, getBeatEvaluationChecklist } from './writing-laws'
import { bibleToPrompt, SeriesBible } from './series-bible'
import { ragService } from '../services/rag-service'
import { entityRegistry, EntityReference, EntityType } from '../services/entity-registry'
import { entityGraphService, ScoredEntity } from '../services/entity-graph-service'
import { extractRefIds } from '../utils/reference-parser'

interface AgentContext {
  role: string
  systemPrompt: string
  stateContext: string
  ragContext?: string
}

// Cache for RAG context to avoid repeated calls in same graph execution
const ragContextCache: Map<string, { context: AgentContext['ragContext']; timestamp: number }> =
  new Map()
const RAG_CACHE_TTL = 30000 // 30 seconds

// Get master prompt context if set
function getMasterPromptContext(state: WritersRoomState): string {
  const bible = state.seriesBible as SeriesBible | undefined
  // Check if masterPrompt exists on the object despite strictly typed interface
  const masterPrompt = (bible as any)?.masterPrompt
  if (!masterPrompt || masterPrompt.trim() === '') return ''

  return `
## PROJECT MASTER PROMPT (User-defined style & instructions)
${masterPrompt}

---
`
}

// Compress beat board to essential info
function summarizeBeats(beats: BeatCard[], maxBeats: number = 10): string {
  if (beats.length === 0) return 'No beats on the board yet.'

  const recent = beats.slice(-maxBeats)
  return recent
    .map((b, i) => `${i + 1}. [${b.beatType.toUpperCase()}] ${b.logline} (${b.status})`)
    .join('\n')
}

// Summarize character states
function summarizeCharacters(characters: CharacterState[]): string {
  if (characters.length === 0) return 'No characters defined.'

  return characters
    .map(
      c =>
        `- ${c.name}: Stress ${c.metrics?.perceivedStakes || 0}%, Transform ${c.metrics?.transformation || 0}%
   Goals: ${Array.isArray(c.currentGoals) ? c.currentGoals.join(', ') : c.currentGoals || 'None'}
   Fears: ${Array.isArray(c.fears) ? c.fears.join(', ') : c.fears || 'None'}
   Self-delusion: "${c.selfDelusion || 'Unknown'}"`
    )
    .join('\n')
}

// Get phase-specific instructions
function getPhaseInstructions(phase: Phase): string {
  switch (phase) {
    case 'premise':
      return `
CURRENT PHASE: PREMISE
You are helping establish the series bible. Work with the user to define:
- The core premise and logline
- Central theme and thematic question
- Main characters and their transformation arcs
- World rules and tone guidelines

Do not propose beats yet. Focus on establishing the foundation.`

    case 'breaking':
      return `
CURRENT PHASE: BREAKING
You are breaking the story beat by beat. For each beat:
1. PlotArchitect proposes a beat with all Mazur elements
2. CharacterPsychology validates character motivations
3. ConsequenceTracker updates setups/payoffs
4. DevilsAdvocate challenges the beat
5. Showrunner approves, requests revision, or rejects

Target: 60-65 beats per episode. Currently: {beatCount} beats.`

    case 'cardlock':
      return `
CURRENT PHASE: CARD LOCK
The beat board is frozen. Review and finalize:
- Verify all setups have payoffs planned
- Check character arc progression
- Ensure causal logic is sound
- Get user approval before proceeding to writing`

    case 'writing':
      return `
CURRENT PHASE: WRITING
Transform locked beats into screenplay prose.
- Write scene by scene
- Maintain character voices
- Include visual descriptions
- Follow screenplay format`

    default:
      return ''
  }
}

// Build context for Showrunner
export function buildShowrunnerContext(state: WritersRoomState): AgentContext {
  const bible = state.seriesBible as SeriesBible | undefined

  return {
    role: 'Showrunner',
    systemPrompt: `${getMasterPromptContext(state)}You are the SHOWRUNNER of a writers room. You own the vision and DRIVE the story forward.

## YOUR APPROACH: BE PROACTIVE
When the user gives you a story reference (like "Breaking Bad"):
1. IMMEDIATELY extract genre, tone, themes from that reference
2. Set up the series bible via UPDATE_SERIES_BIBLE action
3. Describe your vision for this world
4. Propose the opening beat or ask about the protagonist

DO NOT:
- Ask "What would you like to do next?"
- Ask about genre/tone if user gave a reference
- Wait for permission - just proceed!
- Repeat questions that were already answered

${getPhaseInstructions(state.currentPhase).replace('{beatCount}', String(state.beatBoard.length))}

${
  bible?.genre
    ? `ESTABLISHED BIBLE:
- Genre: ${Array.isArray(bible.genre) ? bible.genre.join(', ') : bible.genre || 'TBD'}
- Tone: ${Array.isArray(bible.tone) ? bible.tone.join(', ') : bible.tone || 'TBD'}
- Themes: ${bible.centralTheme || 'TBD'}
`
    : 'No series bible yet - extract from user input or establish now.'
}

YOUR POWERS:
- UPDATE_SERIES_BIBLE: Set genre, tone, themes
- CREATE_BEAT: Propose a new beat
- APPROVED/REJECTED/REVISION_NEEDED: For evaluating proposed beats
- ADVANCE_PHASE: When ready to move to next phase

${getBeatEvaluationChecklist()}

Be specific and concrete. Take action.`,

    stateContext: `
CURRENT STATE:
- Phase: ${state.currentPhase}
- Iteration: ${state.phaseIterations}/${state.maxIterationsPerPhase}
- Beats on board: ${state.beatBoard.length}
- Unresolved setups: ${state.unresolvedSetups.length}

USER DECISIONS ALREADY MADE (DO NOT ASK AGAIN):
// userDecisions removed from types
'None yet'

RECENT BEATS:
${summarizeBeats(state.beatBoard)}

CHARACTERS:
${summarizeCharacters(state.characters)}

${
  state.currentBeat
    ? `
BEAT UNDER REVIEW:
${JSON.stringify(state.currentBeat, null, 2)}
`
    : ''
}`,
  }
}

// Build context for Plot Architect
export function buildPlotArchitectContext(state: WritersRoomState): AgentContext {
  const bible = state.seriesBible as SeriesBible | undefined

  return {
    role: 'PlotArchitect',
    systemPrompt: `${getMasterPromptContext(state)}You are the PLOT ARCHITECT. You propose beats that serve character transformation.

${getWritingLawsContext()}

YOUR OUTPUT FORMAT:
For each beat, provide:

BEAT PROPOSAL:
- Logline: [Max 50 words - fits on index card]
- Type: [setup/complication/revelation/decision/consequence]
- Characters: [Who is involved]
- Visual Hook: [First image we see]

MAZUR ELEMENTS:
- Character: [Trait revealed]
- Object: [Physical prop]
- Core Concept: [Theme connection]
- Attribute: [Sensory detail]
- Action: [Active verb]
- Method: [How they do it]
- Setting: [Environment]
- Timeframe: [Time pressure]
- Motivation: [Why]
- Tone: [Atmosphere]

CAUSAL LOGIC:
- Setup by: [Previous beat that enables this]
- Sets up: [Future payoff this creates]

Remember: Every beat must be INDISPENSABLE. If you can remove it without breaking causality, don't propose it.`,

    stateContext: `
${bible ? bibleToPrompt(bible) : ''}

BEATS ON BOARD (${state.beatBoard.length}):
${summarizeBeats(state.beatBoard)}

UNRESOLVED SETUPS:
${state.unresolvedSetups.map(s => `- ${s.description}`).join('\n') || 'None'}

REJECTED BEATS (mine from):
${
  state.rejectedBeats
    .slice(-5)
    .map(b => `- ${b.logline}`)
    .join('\n') || 'None'
}

CHARACTERS:
${summarizeCharacters(state.characters)}

Propose the next beat that advances the story.`,
  }
}

// Build context for Character Psychology
export function buildCharacterPsychologyContext(state: WritersRoomState): AgentContext {
  return {
    role: 'CharacterPsychology',
    systemPrompt: `${getMasterPromptContext(state)}You are the CHARACTER PSYCHOLOGY expert. You have VETO POWER.

For every proposed beat, you must validate:
1. Would this character ACTUALLY do this given their psychology?
2. What's going through their head in this moment?
3. How do they justify this action to themselves?

CORE PRINCIPLES:
- No one sees themselves as the villain
- Characters act from their distorted worldview
- Self-justification is always present
- Actions must serve WANT or reveal NEED

YOUR POWERS:
- APPROVED: Character motivation is sound, note any emotional shifts
- REJECTED: Character would NOT do this, explain why

If you APPROVE, you MUST specify:
- Emotional shift (if any): [from] → [to]
- Stress level change: [+/-X]
- What they tell themselves: "[justification]"

Be rigorous. A beat with invalid character psychology breaks the story.`,

    stateContext: `
CHARACTERS IN SCENE:
${summarizeCharacters(state.characters)}

${
  state.currentBeat
    ? `
BEAT TO EVALUATE:
${JSON.stringify(state.currentBeat, null, 2)}

For each character involved, validate their psychology.
`
    : 'No beat to evaluate.'
}`,
  }
}

// Build context for Consequence Tracker
export function buildConsequenceTrackerContext(state: WritersRoomState): AgentContext {
  return {
    role: 'ConsequenceTracker',
    systemPrompt: `${getMasterPromptContext(state)}You are the CONSEQUENCE TRACKER. You maintain the causal graph.

YOUR RESPONSIBILITIES:
1. Track setups awaiting payoff (Chekhov's guns)
2. Monitor who knows what (dramatic irony)
3. Flag dangling threads
4. Ensure consequences ripple forward

Nothing is free. Every action has consequences. Every setup needs payoff.

OUTPUT FORMAT:
- New Setup Added: [description] (from beat X, needs payoff by beat Y)
- Setup Resolved: [setup] paid off by [current beat]
- Dangling Warning: [setup] still unresolved after [N] beats
- Knowledge Update: [Character] now knows [fact]

Keep the graph consistent.`,

    stateContext: `
CURRENT SETUPS AWAITING PAYOFF:
${state.unresolvedSetups.map((s, i) => `${i + 1}. ${s.description} (set up in beat ${s.beatId})`).join('\n') || 'None'}

BEAT BOARD:
${summarizeBeats(state.beatBoard, 20)}

${
  state.currentBeat
    ? `
CURRENT BEAT:
${JSON.stringify(state.currentBeat, null, 2)}

Analyze this beat for setups and payoffs.
`
    : ''
}`,
  }
}

// Build context for Devil's Advocate
export function buildDevilsAdvocateContext(state: WritersRoomState): AgentContext {
  return {
    role: 'DevilsAdvocate',
    systemPrompt: `${getMasterPromptContext(state)}You are the DEVIL'S ADVOCATE. Your job is to BREAK THINGS.

Find the weakness in every beat. Ask "But what about...?"

ATTACK VECTORS:
1. Plot holes - Does this logically follow?
2. Character inconsistency - Would they really?
3. Clichés - Have we seen this before?
4. Missed opportunities - What's more interesting?
5. Coincidence - Is this too convenient?
6. Stakes - Why should we care?

YOU MUST PROVIDE:
1. The strongest objection to this beat
2. An alternative that might be better
3. Your honest assessment: PASS (proceed) or CHALLENGE (needs work)

Be adversarial but constructive. Your job is to make the story BETTER by finding problems BEFORE they're locked in.`,

    stateContext: `
${
  state.currentBeat
    ? `
BEAT TO CHALLENGE:
${JSON.stringify(state.currentBeat, null, 2)}

Previous challenges have been addressed. Find NEW problems or let it pass.
`
    : 'No beat to challenge.'
}

RECENT BEATS (for context):
${summarizeBeats(state.beatBoard, 5)}`,
  }
}

// Build context for Writer
export function buildWriterContext(state: WritersRoomState): AgentContext {
  const bible = state.seriesBible as SeriesBible | undefined

  return {
    role: 'Writer',
    systemPrompt: `${getMasterPromptContext(state)}You are the WRITER. You transform locked beats into screenplay prose.

SCREENPLAY FORMAT:
- Scene headings: INT./EXT. LOCATION - DAY/NIGHT
- Action lines: Present tense, visual, concise
- Character names: CAPS when introduced, before dialogue
- Dialogue: Centered, character voice distinct
- Parentheticals: Sparingly, for non-obvious delivery

${
  bible?.toneGuidelines
    ? `
TONE GUIDELINES:
- Violence: ${bible.toneGuidelines.violence}
- Humor: ${bible.toneGuidelines.humor}
- Dialogue: ${bible.toneGuidelines.dialogue}
`
    : ''
}

The structure is set. Now do jazz. Make it sing.

Keep each scene focused on its beat's purpose. Show, don't tell.`,

    stateContext: `
${
  state.currentBeat
    ? `
BEAT TO WRITE:
Logline: ${state.currentBeat.logline}
Visual Hook: ${state.currentBeat.visualHook}
Characters: ${Array.isArray(state.currentBeat.charactersInvolved) ? state.currentBeat.charactersInvolved.join(', ') : state.currentBeat.charactersInvolved}
Emotional Shifts: ${JSON.stringify(state.currentBeat.emotionalShifts)}
`
    : ''
}

${
  state.script
    ? `
SCRIPT SO FAR (last 500 chars):
...${state.script.slice(-500)}
`
    : 'Starting fresh script.'
}

Write the next scene based on the beat.`,
  }
}

// Main assembler function (sync version for backwards compatibility)
export function assembleContext(
  state: WritersRoomState,
  agentRole:
    | 'showrunner'
    | 'plotArchitect'
    | 'characterPsychology'
    | 'consequenceTracker'
    | 'devilsAdvocate'
    | 'writer'
): AgentContext {
  switch (agentRole) {
    case 'showrunner':
      return buildShowrunnerContext(state)
    case 'plotArchitect':
      return buildPlotArchitectContext(state)
    case 'characterPsychology':
      return buildCharacterPsychologyContext(state)
    case 'consequenceTracker':
      return buildConsequenceTrackerContext(state)
    case 'devilsAdvocate':
      return buildDevilsAdvocateContext(state)
    case 'writer':
      return buildWriterContext(state)
    default:
      throw new Error(`Unknown agent role: ${agentRole}`)
  }
}

/**
 * Enhanced async assembler with RAG integration
 */
export async function assembleContextWithRag(
  state: WritersRoomState,
  agentRole:
    | 'showrunner'
    | 'plotArchitect'
    | 'characterPsychology'
    | 'consequenceTracker'
    | 'devilsAdvocate'
    | 'writer'
): Promise<AgentContext> {
  // Get base context
  const baseContext = assembleContext(state, agentRole)

  // Skip RAG if no project ID
  if (!state.projectId) {
    return baseContext
  }

  // Check cache
  const cacheKey = `${state.projectId}:${agentRole}:${state.currentBeat?.id || 'none'}`
  const cached = ragContextCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < RAG_CACHE_TTL) {
    return { ...baseContext, ragContext: cached.context }
  }

  try {
    // Build query context based on agent role and current state
    const queryContext = buildRagQuery(state, agentRole)

    // Retrieve relevant context from RAG
    const ragResults = await ragService.assembleAgentContext(
      state.projectId,
      agentRole,
      queryContext
    )

    // Format RAG context
    let ragContext = ''

    if (ragResults.relevantHistory) {
      ragContext += `\n## RELEVANT HISTORY\n${ragResults.relevantHistory}\n`
    }

    if (ragResults.pastDecisions) {
      ragContext += `\n## PAST DECISIONS (learn from these)\n${ragResults.pastDecisions}\n`
    }

    if (ragResults.userPreferences) {
      ragContext += `\n## USER PREFERENCES (respect these)\n${ragResults.userPreferences}\n`
    }

    // Cache the result
    ragContextCache.set(cacheKey, { context: ragContext, timestamp: Date.now() })

    // Inject RAG context into state context
    return {
      ...baseContext,
      stateContext: baseContext.stateContext + ragContext,
      ragContext,
    }
  } catch (error) {
    console.warn('RAG context assembly failed:', error)
    return baseContext
  }
}

/**
 * Build a query string for RAG based on current state and agent role
 */
function buildRagQuery(state: WritersRoomState, agentRole: string): string {
  const parts: string[] = []

  // Add current beat context
  if (state.currentBeat) {
    parts.push(`Current beat: ${state.currentBeat.logline}`)
    parts.push(`Beat type: ${state.currentBeat.beatType}`)
    if (state.currentBeat.charactersInvolved.length > 0) {
      parts.push(
        `Characters: ${Array.isArray(state.currentBeat.charactersInvolved) ? state.currentBeat.charactersInvolved.join(', ') : state.currentBeat.charactersInvolved}`
      )
    }
  }

  // Add phase context
  parts.push(`Phase: ${state.currentPhase}`)

  // Add agent-specific context
  switch (agentRole) {
    case 'plotArchitect':
      parts.push('story beat creation, plot development, story structure')
      break
    case 'characterPsychology':
      parts.push('character motivation, psychology, behavior consistency')
      if (state.characters.length > 0) {
        parts.push(`Characters: ${state.characters.map(c => c.name).join(', ')}`)
      }
      break
    case 'devilsAdvocate':
      parts.push('story critique, plot holes, improvements, challenges')
      break
    case 'consequenceTracker':
      parts.push('setups, payoffs, story consequences, continuity')
      break
    case 'writer':
      parts.push('screenplay writing, dialogue, scene description')
      break
    default:
      parts.push('story development, creative decisions')
  }

  return parts.join('. ')
}

/**
 * Store context for future RAG retrieval
 */
export async function storeDecisionForRag(
  projectId: string,
  decision: {
    type: 'beat_approved' | 'beat_rejected' | 'beat_revised' | 'user_feedback'
    content: string
    reasoning: string
    agentName: string
    beatId?: string
  }
) {
  try {
    if (decision.type === 'user_feedback') {
      await ragService.storeUserFeedback(projectId, decision.content, decision.reasoning)
    } else {
      const decisionType = decision.type.replace('beat_', '') as 'approved' | 'rejected' | 'revised'
      await ragService.storeBeatDecision(
        projectId,
        decision.content,
        decisionType,
        decision.reasoning,
        decision.agentName,
        decision.beatId
      )
    }
  } catch (error) {
    console.warn('Failed to store decision for RAG:', error)
  }
}

/**
 * Clear the RAG context cache
 */
export function clearRagCache() {
  ragContextCache.clear()
}

// ==========================================
// SMART ENTITY REFERENCE CONTEXT ASSEMBLY
// ==========================================

/**
 * Options for smart context assembly
 */
interface SmartContextOptions {
  /** Maximum depth for graph traversal */
  graphDepth?: number
  /** Similarity threshold for related entities */
  similarityThreshold?: number
  /** Maximum entities to include per type */
  maxEntitiesPerType?: number
  /** Maximum total entities (hard limit) */
  maxTotalEntities?: number
  /** Minimum relevance score to include (0-1) */
  minRelevanceScore?: number
  /** Include related entities via GraphRAG */
  includeRelated?: boolean
  /** Entity types to include (undefined = all) */
  types?: EntityType[]
}

const DEFAULT_SMART_OPTIONS: Required<SmartContextOptions> = {
  graphDepth: 2,
  similarityThreshold: 0.7,
  maxEntitiesPerType: 10,
  maxTotalEntities: 25,
  minRelevanceScore: 0.3,
  includeRelated: true,
  types: [] as EntityType[],
}

/**
 * Smart Context Assembly with Entity References and Relevance Scoring
 * 
 * Instead of including all characters/factions/etc., this function:
 * 1. Extracts entity references from recent messages
 * 2. Uses GraphRAG with random walk scoring to find related entities
 * 3. Ranks by relevance (hop distance + similarity)
 * 4. Limits to configured maximum to keep context focused
 * 
 * Benefits:
 * - Smaller context = faster/cheaper LLM calls
 * - More focused context = better quality responses
 * - Automatic relationship discovery via embeddings
 * - Relevance-based prioritization ensures most important entities included
 */
export async function assembleSmartContext(
  projectId: string,
  recentMessages: string[],
  seriesBible: SeriesBible | undefined,
  options: SmartContextOptions = {}
): Promise<{
  entityContext: string
  referencedEntities: EntityReference[]
  relatedEntities: ScoredEntity[]
  /** Total relevance score (sum of all included entities) */
  totalRelevance: number
}> {
  const opts = { ...DEFAULT_SMART_OPTIONS, ...options }

  // 1. Extract entity references from recent messages
  const combinedText = recentMessages.join('\n')
  const referencedIds = extractRefIds(combinedText)

  // 2. Resolve referenced entities
  const referencedEntities = await entityRegistry.resolveMany(referencedIds)
  const resolvedRefs = Array.from(referencedEntities.values())

  // 3. Find related entities via GraphRAG with scoring (if enabled and we have references)
  let scoredRelated: ScoredEntity[] = []
  
  if (opts.includeRelated && referencedIds.length > 0) {
    scoredRelated = await entityGraphService.findRelatedEntitiesWithScoring(
      referencedIds,
      projectId,
      {
        threshold: opts.similarityThreshold,
        maxDepth: opts.graphDepth,
        maxResults: opts.maxTotalEntities,
        types: opts.types.length > 0 ? opts.types : undefined,
        randomWalkSteps: 100,
        restartProbability: 0.15,
      }
    )
    
    // Filter by minimum relevance score
    scoredRelated = scoredRelated.filter(e => e.relevance >= opts.minRelevanceScore)
    
    // Remove entities that are already in referenced (they have relevance 1.0)
    const referencedIdSet = new Set(resolvedRefs.map(e => e.id))
    scoredRelated = scoredRelated.filter(e => !referencedIdSet.has(e.id))
  }

  // 4. Apply hard limit on total entities
  const totalLimit = opts.maxTotalEntities - resolvedRefs.length
  const limitedRelated = scoredRelated.slice(0, Math.max(0, totalLimit))

  // 5. Calculate total relevance
  const referencedRelevance = resolvedRefs.length // Each referenced entity has implicit relevance 1.0
  const relatedRelevance = limitedRelated.reduce((sum, e) => sum + e.relevance, 0)
  const totalRelevance = referencedRelevance + relatedRelevance

  // 6. Build optimized context string
  const entityContext = buildEntityContextString(resolvedRefs, limitedRelated, opts)

  return {
    entityContext,
    referencedEntities: resolvedRefs,
    relatedEntities: limitedRelated,
    totalRelevance,
  }
}

/**
 * Build a formatted context string from entities with relevance scoring
 */
function buildEntityContextString(
  referenced: EntityReference[],
  related: ScoredEntity[],
  options: Required<SmartContextOptions>
): string {
  if (referenced.length === 0 && related.length === 0) {
    return ''
  }

  const sections: string[] = []

  // Group entities by type
  const groupByType = <T extends EntityReference>(entities: T[]) => {
    const grouped = new Map<EntityType, T[]>()
    for (const entity of entities) {
      if (!grouped.has(entity.type)) {
        grouped.set(entity.type, [])
      }
      grouped.get(entity.type)!.push(entity)
    }
    return grouped
  }

  // Format entity for context (basic version)
  const formatEntity = (entity: EntityReference): string => {
    const parts = [
      `- **[${entity.name}][${entity.id}]**`,
    ]
    if (entity.description) {
      parts.push(`  ${entity.description}`)
    }
    // Include key metadata
    if (entity.metadata) {
      const relevantKeys = ['role', 'motivation', 'archetype', 'category', 'ideology']
      for (const key of relevantKeys) {
        if (entity.metadata[key]) {
          parts.push(`  ${key}: ${entity.metadata[key]}`)
        }
      }
    }
    return parts.join('\n')
  }

  // Format scored entity with relevance info
  const formatScoredEntity = (entity: ScoredEntity): string => {
    const parts = [
      `- **[${entity.name}][${entity.id}]** _(relevance: ${(entity.relevance * 100).toFixed(0)}%, ${entity.hopDistance}-hop)_`,
    ]
    if (entity.description) {
      parts.push(`  ${entity.description}`)
    }
    // Include key metadata
    if (entity.metadata) {
      const relevantKeys = ['role', 'motivation', 'archetype', 'category', 'ideology']
      for (const key of relevantKeys) {
        if (entity.metadata[key]) {
          parts.push(`  ${key}: ${entity.metadata[key]}`)
        }
      }
    }
    // Show relationship path if discovered via another entity
    if (entity.discoveredVia) {
      parts.push(`  _discovered via: ${entity.discoveredVia}_`)
    }
    return parts.join('\n')
  }

  // Add referenced entities (these are explicitly mentioned - highest priority)
  if (referenced.length > 0) {
    sections.push('## REFERENCED ENTITIES (mentioned in conversation, relevance: 100%)')
    const grouped = groupByType(referenced)
    
    for (const [type, entities] of grouped) {
      const limited = entities.slice(0, options.maxEntitiesPerType)
      sections.push(`\n### ${type.charAt(0).toUpperCase() + type.slice(1)}s`)
      sections.push(limited.map(formatEntity).join('\n\n'))
    }
  }

  // Add related entities (discovered via GraphRAG with relevance scores)
  if (related.length > 0) {
    sections.push('\n## RELATED ENTITIES (discovered via GraphRAG, ranked by relevance)')
    const grouped = groupByType(related)
    
    // Sort types by total relevance within type
    const sortedTypes = Array.from(grouped.entries()).sort((a, b) => {
      const aRelevance = a[1].reduce((sum, e) => sum + e.relevance, 0)
      const bRelevance = b[1].reduce((sum, e) => sum + e.relevance, 0)
      return bRelevance - aRelevance
    })
    
    for (const [type, entities] of sortedTypes) {
      if (entities.length === 0) continue
      
      // Already sorted by relevance from the service, but ensure it
      const sorted = [...entities].sort((a, b) => b.relevance - a.relevance)
      const limited = sorted.slice(0, options.maxEntitiesPerType)
      
      sections.push(`\n### ${type.charAt(0).toUpperCase() + type.slice(1)}s`)
      sections.push(limited.map(formatScoredEntity).join('\n\n'))
    }
  }

  return sections.join('\n')
}

/**
 * Enhanced context assembly that combines traditional and smart context
 * Uses GraphRAG with relevance scoring for optimal entity selection
 */
export async function assembleContextWithSmartEntities(
  state: WritersRoomState,
  agentRole:
    | 'showrunner'
    | 'plotArchitect'
    | 'characterPsychology'
    | 'consequenceTracker'
    | 'devilsAdvocate'
    | 'writer',
  recentMessages: string[] = []
): Promise<AgentContext & { smartContextStats?: { referencedCount: number; relatedCount: number; totalRelevance: number } }> {
  // Get base context
  const baseContext = assembleContext(state, agentRole)

  // Skip smart context if no project ID
  if (!state.projectId) {
    return baseContext
  }

  try {
    // Get smart entity context with relevance scoring
    const { entityContext, referencedEntities, relatedEntities, totalRelevance } = await assembleSmartContext(
      state.projectId,
      recentMessages,
      state.seriesBible as SeriesBible | undefined,
      {
        // Character psychology agent needs more character context
        types: agentRole === 'characterPsychology' ? ['character'] : undefined,
        maxEntitiesPerType: agentRole === 'writer' ? 5 : 10,
        // Stricter relevance threshold for writer (needs focused context)
        minRelevanceScore: agentRole === 'writer' ? 0.5 : 0.3,
        // More total entities for showrunner (needs broader view)
        maxTotalEntities: agentRole === 'showrunner' ? 30 : 25,
      }
    )

    const stats = {
      referencedCount: referencedEntities.length,
      relatedCount: relatedEntities.length,
      totalRelevance,
    }

    // Only use smart context if we have referenced entities
    // Otherwise fall back to full context
    if (referencedEntities.length > 0) {
      console.log(
        `[SmartContext] Assembled context with ${stats.referencedCount} referenced + ${stats.relatedCount} related entities (total relevance: ${totalRelevance.toFixed(2)})`
      )
      return {
        ...baseContext,
        stateContext: `${baseContext.stateContext}\n\n## ENTITIES IN FOCUS\n${entityContext}`,
        smartContextStats: stats,
      }
    }

    // Fallback: get RAG context
    const ragContext = await assembleContextWithRag(state, agentRole)
    return { ...ragContext, smartContextStats: stats }
  } catch (error) {
    console.warn('[SmartContext] Entity context assembly failed:', error)
    return baseContext
  }
}

/**
 * Sync entities from bible/state to the registry
 * Should be called when loading a project
 */
export async function syncEntitiesToRegistry(
  projectId: string,
  bible: SeriesBible | undefined,
  characters: CharacterState[],
  beats: BeatCard[] = []
): Promise<void> {
  try {
    // Sync characters
    if (characters.length > 0) {
      await entityRegistry.syncFromSource(
        projectId,
        'character',
        characters.map(c => ({
          id: c.id || c.name,
          name: c.name,
          description: `${c.currentGoals ? `Goals: ${c.currentGoals}` : ''} ${c.fears ? `Fears: ${c.fears}` : ''}`,
          role: c.role,
          ...c,
        }))
      )
    }

    // Sync factions from bible
    const factions = bible?.factions || (bible?.storyPlan as any)?.factions || []
    if (factions.length > 0) {
      await entityRegistry.syncFromSource(
        projectId,
        'faction',
        factions.map((f: any) => ({
          id: f.id || f.name,
          name: f.name,
          description: f.ideology || f.description || '',
          ...f,
        }))
      )
    }

    // Sync world rules from bible
    const worldRules = bible?.worldRules || (bible?.storyPlan as any)?.worldRules || []
    if (worldRules.length > 0) {
      await entityRegistry.syncFromSource(
        projectId,
        'rule',
        worldRules.map((r: any, i: number) => ({
          id: r.id || `rule-${i}`,
          name: r.rule?.slice(0, 50) || `Rule ${i + 1}`,
          description: r.consequence || r.description || '',
          category: r.category,
          ...r,
        }))
      )
    }

    // Sync beats
    if (beats.length > 0) {
      await entityRegistry.syncFromSource(
        projectId,
        'beat',
        beats.map(b => ({
          id: b.id,
          name: b.logline?.slice(0, 40) || `Beat ${b.sequence}`,
          description: b.content || b.logline || '',
          sequence: b.sequence,
          beatType: b.beatType,
          ...b,
        }))
      )
    }

    console.log(`[SmartContext] Synced entities for project ${projectId}`)
  } catch (error) {
    console.warn('[SmartContext] Entity sync failed:', error)
  }
}
