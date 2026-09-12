import {
  LOOP_CREATOR_AUTO_START_PROMPT_PREFIX,
  LOOP_CREATOR_AUTO_START_PROMPT_SUFFIX,
} from '@/domains/loop-creator/constants/loop-creator-auto-start'

export function buildLoopCreatorAutoStartPrompt(gameConcept: string): string {
  return `${LOOP_CREATOR_AUTO_START_PROMPT_PREFIX}${gameConcept}${LOOP_CREATOR_AUTO_START_PROMPT_SUFFIX}`
}
