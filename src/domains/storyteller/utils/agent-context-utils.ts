import { AIMessage, BaseMessage } from '@langchain/core/messages'
import { WritersRoomState } from '../graph/state'
import { detectTargetSection, buildSectionContext } from './section-utils'
import {
  SECTION_PROMPTS,
  SECTION_TO_PROMPT_ID,
  PREMISE_ARCHITECT_SYSTEM_PROMPT,
} from '../prompts/section-prompts'
import { loadPromptCached } from '../prompts/hub-loader'

/**
 * Checks if the Bible is locked and the user has permission to edit.
 * Returns an AIMessage with a lock notice if generation should be blocked.
 */
export function checkBibleLock(state: WritersRoomState): AIMessage | null {
  const isBibleLocked = state.seriesBible?.isLocked === true
  const userEmail = state.userEmail?.toLowerCase() || ''

  // Check if user is admin
  const centralUsers = (process.env.NEXT_PUBLIC_CENTRAL_USERS || 'jacek.sroga.itc@gmail.com')
    .split(',')
    .map(e => e.trim().toLowerCase())
  const isAdmin = centralUsers.includes(userEmail)

  if (isBibleLocked && !isAdmin) {
    return new AIMessage({
      content: `🔒 **World Bible is Locked**

The Series Bible has been locked by an administrator. While locked, I cannot make any changes to:
- World Description, World Rules, Factions
- Key Characters, Inspirations, Soundtracks
- Plot Twists, Episode Roadmap

**What you can do instead:**
- 📝 Work on individual **Episode Premises**
- 🎬 Create and break **Story Beats**
- 👥 Develop character arcs within episodes
- 📖 Read and reference the World Bible (read-only)

💡 *Ask your admin to unlock the Bible if you need to make changes.*`,
      name: 'PremiseArchitect',
    })
  }

  return null
}

/**
 * Builds the system prompt and context message for the agent based on user instruction.
 */
export async function buildAgentContext(
  userInstruction: string,
  existingBible: any,
  storyPlan: any,
  masterPrompt: string
): Promise<{
  systemPrompt: string
  contextMessage: string
  section: string
  isSectionUpdate: boolean
}> {
  const { section } = detectTargetSection(userInstruction)
  const isSectionUpdate = section !== 'full'

  const promptId = SECTION_TO_PROMPT_ID[section]
  const loadedPrompt = await loadPromptCached(promptId)

  // Extract system template from ChatPromptTemplate
  const promptMessages =
    (loadedPrompt.prompt as any).promptMessages || (loadedPrompt.prompt as any).messages || []
  const systemMessage = promptMessages.find(
    (m: BaseMessage) =>
      (m as any).lc_id?.[3] === 'SystemMessagePromptTemplate' || (m as any)._type === 'system'
  )
  const systemTemplate =
    systemMessage?.prompt?.template ||
    systemMessage?.template ||
    (isSectionUpdate ? SECTION_PROMPTS[section] : PREMISE_ARCHITECT_SYSTEM_PROMPT)

  let systemPrompt: string
  let contextMessage: string

  if (isSectionUpdate) {
    systemPrompt = systemTemplate
    const sectionContext = buildSectionContext(section, existingBible, storyPlan)

    contextMessage = `
## EXISTING WORLD CONTEXT (For Reference)

**Title:** ${storyPlan.title || existingBible.title || 'Untitled'}
**Genre:** ${storyPlan.genre || existingBible.genre || 'Not defined'}
**Tone:** ${storyPlan.tone || existingBible.tone || 'Not defined'}

${sectionContext}

## USER'S REQUEST
${userInstruction}

Generate the update for the ${section} section. Use smart merge to preserve existing content while incorporating changes.
`
  } else {
    systemPrompt = PREMISE_ARCHITECT_SYSTEM_PROMPT
    contextMessage = `
## PROJECT CONTEXT

${masterPrompt ? `**Master Prompt (Project Style):**\n${masterPrompt}\n` : ''}

${existingBible.genre ? `**Established Genre:** ${existingBible.genre}` : ''}
${existingBible.tone ? `**Established Tone:** ${existingBible.tone}` : ''}
${existingBible.themes ? `**Established Themes:** ${existingBible.themes.join(', ')}` : ''}

## USER'S STORY IDEA
Based on the conversation, create the World Bible and Initial Conflict.
`
  }

  return { systemPrompt, contextMessage, section, isSectionUpdate }
}
