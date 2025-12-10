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

import { WritersRoomState, BeatCard, CharacterState, Phase } from '../graph/state'
import { getWritingLawsContext, getBeatEvaluationChecklist } from './writing-laws'
import { bibleToPrompt, SeriesBible } from './series-bible'
import { ragService } from '../services/rag-service'

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
  const masterPrompt = bible?.masterPrompt
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
        `- ${c.name}: Stress ${c.stressLevel}%, Transform ${c.transformationProgress}%
   Goals: ${c.currentGoals.join(', ') || 'None'}
   Fears: ${c.fears.join(', ') || 'None'}
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
  const userDecisions = bible?.userDecisions || {}

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
- Genre: ${bible.genre}
- Tone: ${bible.tone}
- Themes: ${bible.themes?.join(', ') || 'TBD'}
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
${
  Object.entries(userDecisions).length > 0
    ? Object.entries(userDecisions)
        .map(([q, a]) => `- Q: "${q}" → A: "${a}"`)
        .join('\n')
    : 'None yet'
}

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
Characters: ${state.currentBeat.charactersInvolved.join(', ')}
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
      parts.push(`Characters: ${state.currentBeat.charactersInvolved.join(', ')}`)
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
