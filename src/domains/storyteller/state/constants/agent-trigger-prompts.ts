/** Agent trigger prompts for useStorytellerAgents. */

import { SmartQuickActionPrompt } from '@/shared/chat/core/constants/quick-actions'

// const map (not an enum): GenerateEpisodePremiseUser references another enum,
// which a string enum member may not do (prefer-literal-enum-member).
export const StorytellerAgentTriggerPrompt = {
  GenerateEpisodePremiseUser: SmartQuickActionPrompt.GeneratePremise,
  GenerateEpisodeDescriptionUser:
    'Generate only the episode description (the logline). Do not write the rest of the Ozymandias premise.',
  GenerateEpisodePremiseAgent:
    'Please generate an episode premise using the Ozymandias framework. Expand ROADMAP SLOT into episode detail. Do not rewrite the season spine.',
  GenerateRoadmapUser:
    'Please generate a high-level episode roadmap for the season (8-12 slots: title, logline, inciting/midpoint/finale). This is the season spine — not a 10-point plan. If existing episodes are listed, slot N restates episode N at that altitude.',
  GenerateRoadmapAgent:
    'Generate a high-level episode roadmap for the season. Create distinct slots with titles, loglines, and turning points. Do not copy episode 10-point plans into the roadmap.',
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
