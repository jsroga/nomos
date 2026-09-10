import { WORLD_PROMPT_IDEAS, type WorldPromptIdea } from '../constants/worldPromptIdeas'

export { WORLD_PROMPT_IDEAS, type WorldPromptIdea }

export function getRandomWorldPromptIdea(): WorldPromptIdea {
  const index = Math.floor(Math.random() * WORLD_PROMPT_IDEAS.length)
  return WORLD_PROMPT_IDEAS[index]
}
