/** Agent trigger prompts for useStorytellerAgents. */

import { lookupPromptBody } from '@/domains/storyteller/ai/prompts/registry/prompt-registry-table'
import { StorytellerPromptRegistryId } from '@/domains/storyteller/ai/prompts/registry/prompt-registry-ids'
import { SmartQuickActionPrompt } from '@/shared/chat/core/constants/quick-actions'

// const map (not an enum): GenerateEpisodePremiseUser references another enum,
// which a string enum member may not do (prefer-literal-enum-member).
export const StorytellerAgentTriggerPrompt = {
  GenerateEpisodePremiseUser: SmartQuickActionPrompt.GeneratePremise,
  GenerateEpisodeDescriptionUser: lookupPromptBody(
    StorytellerPromptRegistryId.GenerateEpisodeDescriptionUser
  ),
  GenerateEpisodePremiseAgent: lookupPromptBody(
    StorytellerPromptRegistryId.GenerateEpisodePremiseAgent
  ),
  GenerateRoadmapUser: lookupPromptBody(StorytellerPromptRegistryId.GenerateRoadmapUser),
  GenerateRoadmapAgent: lookupPromptBody(StorytellerPromptRegistryId.GenerateRoadmapAgent),
  RegeneratePremiseSectionUserPrefix: lookupPromptBody(
    StorytellerPromptRegistryId.RegeneratePremiseSectionUserPrefix
  ),
  RegeneratePremiseSectionUserSuffix: lookupPromptBody(
    StorytellerPromptRegistryId.RegeneratePremiseSectionUserSuffix
  ),
  RegeneratePremiseSectionAgentPrefix: lookupPromptBody(
    StorytellerPromptRegistryId.RegeneratePremiseSectionAgentPrefix
  ),
  RegeneratePremiseSectionAgentMid: lookupPromptBody(
    StorytellerPromptRegistryId.RegeneratePremiseSectionAgentMid
  ),
  RegeneratePremiseSectionAgentSuffix: lookupPromptBody(
    StorytellerPromptRegistryId.RegeneratePremiseSectionAgentSuffix
  ),
} as const

export type StorytellerAgentTriggerPrompt =
  (typeof StorytellerAgentTriggerPrompt)[keyof typeof StorytellerAgentTriggerPrompt]

export enum StorytellerToastId {
  EpisodePromptSuggestion = 'episode-prompt-suggestion',
}
