/**
 * Script Editor Agent
 *
 * Evaluates script quality following the Evaluator-Optimizer pattern.
 * Reviews script sections for dialogue naturalness, visual hooks, pacing,
 * format compliance, and character voice consistency.
 *
 * Returns PASS (script is good) or REVISE (needs changes) with detailed feedback.
 */

import { AIMessage, SystemMessage } from '@langchain/core/messages'
import { WritersRoomState } from '../graph/state'
import { getModel } from '../config/model-config'
import { getSafeMessageHistory } from '../utils/message-utils'
import { loadPromptCached } from '../prompts/hub-loader'
import {
  ScriptEditorResponseSchema,
  ScriptEditorResponse,
  parseAgentResponse,
} from '../schemas/agent-schemas'

// Model is created inside the function to use request-scoped config (AsyncLocalStorage)

import { SCRIPT_EDITOR_PROMPT } from '../prompts/agents/script-editor'

export const scriptEditorAgent = async (
  state: WritersRoomState
): Promise<Partial<WritersRoomState>> => {
  // Create model inside function to use request-scoped config
  const model = getModel('devilsAdvocate') // Using critique-focused model config

  console.log('Script Editor evaluating script...')
  console.log(`Current revision count: ${state.scriptRevisionCount || 0}`)

  // Only evaluate in writing phase
  if (state.currentPhase !== 'writing' && state.currentPhase !== 'cardlock') {
    const skipMessage = new AIMessage({
      content: 'Script Editor is only active during writing phase.',
      name: 'ScriptEditor',
    })
    return { messages: [skipMessage] }
  }

  // Check if there's script content to evaluate
  if (!state.script || state.script.trim().length === 0) {
    const noScriptMessage = new AIMessage({
      content: 'No script content to evaluate. Please write a scene first.',
      name: 'ScriptEditor',
    })
    return {
      messages: [noScriptMessage],
      lastScriptVerdict: 'REVISE',
      scriptFeedback: ['No script content to evaluate'],
    }
  }

  // Get character voices from bible for context
  const characters = state.seriesBible?.keyCharacters || state.characters || []
  const characterVoices = characters
    .map((c: any) => `- ${c.name}: ${c.archetype || c.role}`)
    .join('\n')

  // Build context
  const contextMessage = `
## SCRIPT TO EVALUATE

${state.script}

## REVISION CONTEXT
- Current revision count: ${state.scriptRevisionCount || 0} / 3
- ${(state.scriptRevisionCount || 0) >= 2 ? 'NOTE: Multiple revisions already. Be lenient unless critical issues exist.' : ''}

## CHARACTER VOICES FOR REFERENCE
${characterVoices || 'No character profiles available'}

## PREVIOUS FEEDBACK (if any)
${state.scriptFeedback?.length ? state.scriptFeedback.join('\n') : 'First evaluation'}
`

  // Load prompt from Hub
  const loadedPrompt = await loadPromptCached('scriptEditor')
  const promptMessages =
    (loadedPrompt.prompt as any).promptMessages || (loadedPrompt.prompt as any).messages || []
  const systemMessage = promptMessages.find(
    (m: any) => m.lc_id?.[3] === 'SystemMessagePromptTemplate' || m._type === 'system'
  )
  const systemTemplate =
    systemMessage?.prompt?.template || systemMessage?.template || SCRIPT_EDITOR_PROMPT

  // Combine system content into single message (required for Claude)
  const combinedSystem = [systemTemplate, contextMessage].join('\n\n---\n\n')
  const conversationMessages = getSafeMessageHistory(state.messages, 3).filter(
    m => m._getType() !== 'system'
  )

  const messages = [new SystemMessage(combinedSystem), ...conversationMessages]

  try {
    // Try structured output first
    let parsed: ScriptEditorResponse | null = null

    try {
      const structuredModel = model.withStructuredOutput(ScriptEditorResponseSchema)
      parsed = (await structuredModel.invoke(messages)) as ScriptEditorResponse
    } catch (structuredError) {
      console.warn('Script Editor: Structured output failed, falling back to manual parsing')

      // Fallback to manual parsing
      const response = await model.invoke(messages)
      const content =
        typeof response.content === 'string' ? response.content : JSON.stringify(response.content)
      parsed = parseAgentResponse(content, ScriptEditorResponseSchema)
    }

    // Default fallback if parsing completely fails
    if (!parsed) {
      parsed = {
        message: 'Script evaluation completed with some parsing issues.',
        thinking: null,
        confidence: 0.5,
        nextAgent: null,
        verdict: 'PASS', // Default to PASS to avoid infinite loop
        feedback: ['Evaluation parsing failed - defaulting to PASS'],
        improvements: [],
        overallQuality: 70,
        strengths: [],
      }
    }

    // Override verdict if max revisions reached
    const revisionCount = state.scriptRevisionCount || 0
    let verdict = parsed.verdict
    if (revisionCount >= 3 && verdict === 'REVISE') {
      console.log('Script Editor: Max revisions reached, forcing PASS')
      verdict = 'PASS'
      parsed.feedback.push('Max revision limit reached. Approving script.')
    }

    // Build response message
    const verdictEmoji = verdict === 'PASS' ? '✅' : '📝'
    const messageContent = `${verdictEmoji} **SCRIPT REVIEW: ${verdict}**

${parsed.message}

**Quality Score:** ${parsed.overallQuality}/100
**Confidence:** ${Math.round(parsed.confidence * 100)}%

${parsed.strengths.length > 0 ? `**Strengths:**\n${parsed.strengths.map(s => `- ${s}`).join('\n')}\n` : ''}

${
  verdict === 'REVISE' && parsed.improvements.length > 0
    ? `**Required Improvements:**\n${parsed.improvements
        .filter(i => i.severity === 'critical' || i.severity === 'important')
        .map(i => `- [${i.category.toUpperCase()}] ${i.issue}\n  → ${i.suggestion}`)
        .join('\n')}`
    : ''
}`

    const namedMessage = new AIMessage({
      content: messageContent,
      name: 'ScriptEditor',
    })

    // Attach metadata for routing
    ;(namedMessage as any).verdict = verdict
    ;(namedMessage as any).confidence = parsed.confidence
    ;(namedMessage as any).improvements = parsed.improvements

    // Increment revision count if we're sending back for revision
    const newRevisionCount = verdict === 'REVISE' ? revisionCount + 1 : revisionCount

    return {
      messages: [namedMessage],
      lastScriptVerdict: verdict,
      scriptRevisionCount: newRevisionCount,
      scriptFeedback: parsed.feedback,
      lastAgentConfidence: parsed.confidence,
    }
  } catch (error) {
    console.error('Script Editor error:', error)
    const errorMessage = new AIMessage({
      content: '⚠️ Script evaluation failed. Defaulting to PASS to continue workflow.',
      name: 'ScriptEditor',
    })
    return {
      messages: [errorMessage],
      lastScriptVerdict: 'PASS', // Default to PASS on error
    }
  }
}
