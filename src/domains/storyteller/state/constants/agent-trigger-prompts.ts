/** Agent trigger prompts for useStorytellerAgents. */

import { SmartQuickActionPrompt } from '@/shared/chat/core/constants/quick-actions'

// const map (not an enum): GenerateEpisodePremiseUser references another enum,
// which a string enum member may not do (prefer-literal-enum-member).
export const StorytellerAgentTriggerPrompt = {
  GenerateEpisodePremiseUser: SmartQuickActionPrompt.GeneratePremise,
  GenerateEpisodeDescriptionUser:
    'Generate only the episode description (the logline). Do not write the rest of the Ozymandias premise.',
  GenerateEpisodePremiseAgent:
    'Please generate an episode premise using the Ozymandias framework. Delegate to the Episode Premise Architect.',
  GenerateRoadmapUser: 'Please generate a detailed episode roadmap for the season.',
  GenerateRoadmapAgent:
    'Generate a detailed episode roadmap for the season. Create distinct episodes with titles, summaries, key factions involved, and consequences. Delegate to the Story Architect.',
  RegeneratePremiseSectionUserPrefix: 'Please regenerate only the ',
  RegeneratePremiseSectionUserSuffix: ' of the episode premise.',
  RegeneratePremiseSectionAgentPrefix: 'Please regenerate ONLY the ',
  RegeneratePremiseSectionAgentMid: ' (',
  RegeneratePremiseSectionAgentSuffix:
    ') for the episode premise. Return a JSON object containing ONLY this field. Do not include unchanged fields. Take a completely new, bold, and distinct creative direction. Do not just rephrase the previous version - give me a brand new idea. Delegate to the Episode Premise Architect.',
} as const

export type StorytellerAgentTriggerPrompt =
  (typeof StorytellerAgentTriggerPrompt)[keyof typeof StorytellerAgentTriggerPrompt]

export enum StorytellerToastId {
  EpisodePromptSuggestion = 'episode-prompt-suggestion',
}
