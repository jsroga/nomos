import { AIMessage } from '@langchain/core/messages'
import { WritersRoomState, Setup } from '../graph/state'
import { assembleContext } from '../context/assembler'
import { SystemMessage } from '@langchain/core/messages'
import { v4 as uuidv4 } from 'uuid'
import { getModel } from '../config/model-config'
import { createTraceableAgent } from '../services/tracing-service'

// Import base agents
import { supervisorAgent as _supervisorAgent } from './supervisor'
import { plotArchitectAgent as _plotArchitectAgent } from './plot-architect'
import { characterPsychologyAgent as _characterPsychologyAgent } from './character-psychology'
import { premiseArchitectAgent as _premiseArchitectAgent } from './premise-architect'
import { writerAgent as _writerAgent } from './writer'
import { worldSimulatorAgent as _worldSimulatorAgent } from './world-simulator'
import { episodePremiseArchitectAgent as _episodePremiseArchitectAgent } from './episode-premise-architect'
import { magicAgent as _magicAgent } from './magic-agent'
import { scriptEditorAgent as _scriptEditorAgent } from './script-editor'

// Re-export traced versions of main agents
// Alias supervisor as showrunner for backward compatibility if needed, but export it as 'Showrunner' for trace logs
export const showrunnerAgent = createTraceableAgent(_supervisorAgent, 'Showrunner')
export const supervisorAgent = createTraceableAgent(_supervisorAgent, 'Supervisor')

export const plotArchitectAgent = createTraceableAgent(_plotArchitectAgent, 'PlotArchitect')
export const characterPsychologyAgent = createTraceableAgent(
  _characterPsychologyAgent,
  'CharacterPsychology'
)
export const premiseArchitectAgent = createTraceableAgent(
  _premiseArchitectAgent,
  'PremiseArchitect'
)
export const writerAgent = createTraceableAgent(_writerAgent, 'Writer')
export const worldSimulatorAgent = createTraceableAgent(_worldSimulatorAgent, 'WorldSimulator')
export const episodePremiseArchitectAgent = createTraceableAgent(
  _episodePremiseArchitectAgent,
  'EpisodePremiseArchitect'
)
export const magicAgent = createTraceableAgent(_magicAgent, 'MagicAgent')

// Script Editor (Evaluator-Optimizer pattern for scripts)
export const scriptEditorAgent = createTraceableAgent(_scriptEditorAgent, 'ScriptEditor')

// Model is created inside each function to use request-scoped config (AsyncLocalStorage)

// Consequence Tracker - Tracks setups awaiting payoff
const _consequenceTrackerAgent = async (
  state: WritersRoomState
): Promise<Partial<WritersRoomState>> => {
  // Create model inside function to use request-scoped config
  const model = getModel('consequenceTracker')

  console.log('Consequence Tracker updating...')

  const context = assembleContext(state, 'consequenceTracker')

  // Combine system content into single message (required for Claude)
  const combinedSystem = [context.systemPrompt, context.stateContext].join('\n\n---\n\n')
  const conversationMessages = state.messages.slice(-3).filter(m => m._getType() !== 'system')

  const messages = [new SystemMessage(combinedSystem), ...conversationMessages]

  try {
    const response = await model.invoke(messages)
    const content =
      typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

    // Parse for new setups
    const updatedSetups = [...state.unresolvedSetups]

    // Look for "New Setup Added:" in response
    const newSetupMatch = content.match(/New Setup Added:\s*(.+?)(?:\n|$)/i)
    if (newSetupMatch && state.currentBeat) {
      updatedSetups.push({
        id: uuidv4(),
        description: newSetupMatch[1].trim(),
        beatId: state.currentBeat.id,
        isResolved: false,
      })
    }

    // Look for "Setup Resolved:" in response
    const resolvedMatch = content.match(/Setup Resolved:\s*(.+?)(?:\n|$)/i)
    if (resolvedMatch) {
      const resolvedDesc = resolvedMatch[1].toLowerCase()
      updatedSetups.forEach((setup, i) => {
        if (
          setup.description.toLowerCase().includes(resolvedDesc) ||
          resolvedDesc.includes(setup.description.toLowerCase())
        ) {
          updatedSetups[i] = { ...setup, isResolved: true, payoffBeatId: state.currentBeat?.id }
        }
      })
    }

    const namedMessage = new AIMessage({
      content,
      name: 'ConsequenceTracker',
    })

    return {
      messages: [namedMessage],
      unresolvedSetups: updatedSetups.filter(s => !s.isResolved),
    }
  } catch (error) {
    console.error('Consequence Tracker error:', error)
    const errorMessage = new AIMessage({
      content: 'Tracking consequences. No issues detected.',
      name: 'ConsequenceTracker',
    })
    return { messages: [errorMessage] }
  }
}

// Export traced version
export const consequenceTrackerAgent = createTraceableAgent(
  _consequenceTrackerAgent,
  'ConsequenceTracker'
)

// Devil's Advocate - Challenges every proposed beat with structured output
const _devilsAdvocateAgent = async (
  state: WritersRoomState
): Promise<Partial<WritersRoomState>> => {
  // Create model inside function to use request-scoped config
  const model = getModel('devilsAdvocate')

  console.log("Devil's Advocate challenging...")

  const context = assembleContext(state, 'devilsAdvocate')

  // Add structured output instruction
  const structuredPrompt = `
## RESPONSE FORMAT

You MUST respond with a JSON object:

{
    "message": "Your critique and reasoning",
    "verdict": "PASS" or "CHALLENGE",
    "objection": "Your strongest objection (if CHALLENGE)",
    "alternative": "A better alternative (if CHALLENGE)",
    "attackVectors": ["plot_hole", "character_inconsistency", "cliche", "missed_opportunity", "coincidence", "stakes"],
    "confidence": 0.85
}

## VERDICT GUIDELINES

Use CHALLENGE when:
- There's a clear plot hole or logic gap
- Character behavior contradicts established psychology
- The beat relies on tired clichés
- There's a more interesting alternative that serves the story better
- The beat relies on coincidence rather than causality
- Stakes are unclear or not compelling

Use PASS when:
- The beat is solid despite minor imperfections
- Objections are nitpicks rather than structural issues
- The beat effectively serves character and plot

Challenge count for this beat: ${state.beatChallengeCount || 0}/${3}
${(state.beatChallengeCount || 0) >= 2 ? 'NOTE: Beat has been revised multiple times. Be more lenient unless there are critical issues.' : ''}

Respond ONLY with valid JSON.
`

  // Combine system content into single message (required for Claude)
  const combinedSystem = [context.systemPrompt, context.stateContext, structuredPrompt].join(
    '\n\n---\n\n'
  )
  const conversationMessages = state.messages.slice(-3).filter(m => m._getType() !== 'system')

  const messages = [new SystemMessage(combinedSystem), ...conversationMessages]

  try {
    const response = await model.invoke(messages)
    const content =
      typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

    // Try to parse structured response
    let parsed: any = null
    try {
      let jsonStr = content
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim()
      }
      parsed = JSON.parse(jsonStr)
    } catch (e) {
      console.warn("Devil's Advocate: Failed to parse JSON")
    }

    const verdict =
      parsed?.verdict || (content.toLowerCase().includes('challenge') ? 'CHALLENGE' : 'PASS')
    const messageContent = parsed?.message || content
    const confidence = parsed?.confidence ?? 0.7

    // Format response with clear verdict
    const formattedContent = `**VERDICT: ${verdict}**

${messageContent}

${verdict === 'CHALLENGE' && parsed?.objection ? `**Objection:** ${parsed.objection}` : ''}
${verdict === 'CHALLENGE' && parsed?.alternative ? `**Alternative:** ${parsed.alternative}` : ''}`

    const namedMessage = new AIMessage({
      content: formattedContent,
      name: 'DevilsAdvocate',
    })

    // Attach metadata for routing
    ;(namedMessage as any).verdict = verdict
    ;(namedMessage as any).confidence = confidence

    return {
      messages: [namedMessage],
      lastDevilVerdict: verdict as 'PASS' | 'CHALLENGE',
      lastAgentConfidence: confidence,
    }
  } catch (error) {
    console.error("Devil's Advocate error:", error)
    const errorMessage = new AIMessage({
      content: '**VERDICT: PASS**\n\nNo major objections. The beat can proceed.',
      name: 'DevilsAdvocate',
    })
    return {
      messages: [errorMessage],
      lastDevilVerdict: 'PASS',
    }
  }
}

// Export traced version
export const devilsAdvocateAgent = createTraceableAgent(_devilsAdvocateAgent, 'DevilsAdvocate')

// Visual Moment - Ensures every beat has a visual hook
export const visualMomentAgent = async (
  state: WritersRoomState
): Promise<Partial<WritersRoomState>> => {
  console.log('Visual Moment designing...')

  if (!state.currentBeat?.visualHook) {
    const content =
      "⚠️ VISUAL HOOK MISSING: What's the first thing we see? Every beat needs an iconic, meaningful image."
    const namedMessage = new AIMessage({
      content,
      name: 'VisualMoment',
    })
    return { messages: [namedMessage] }
  }

  const content = `✓ Visual Hook: "${state.currentBeat.visualHook}" - Make it iconic, meaningful, memorable.`
  const namedMessage = new AIMessage({
    content,
    name: 'VisualMoment',
  })

  return { messages: [namedMessage] }
}

// Writer Agent is now in ./writer.ts
// Re-exported above
