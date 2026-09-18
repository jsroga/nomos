import {
  WORLD_PROMPT_IDEA_IMAGE_POOL,
  WORLD_PROMPT_IDEAS,
  type WorldPromptIdea,
} from '../constants/worldPromptIdeas'
import { STYLE_REFERENCE_URL_MAX } from '@/shared/canvas/style-refs'

export { WORLD_PROMPT_IDEAS, WORLD_PROMPT_IDEA_IMAGE_POOL, type WorldPromptIdea }

let ideaImageCursor = 0

export function getRandomWorldPromptIdea(): WorldPromptIdea {
  const index = Math.floor(Math.random() * WORLD_PROMPT_IDEAS.length)
  return WORLD_PROMPT_IDEAS[index]
}

export function nextWorldPromptIdeaImages(
  count: number = STYLE_REFERENCE_URL_MAX,
): string[] {
  if (count <= 0) return []
  const pool = WORLD_PROMPT_IDEA_IMAGE_POOL
  const picked: string[] = []
  for (let i = 0; i < count; i++) {
    picked.push(pool[ideaImageCursor % pool.length])
    ideaImageCursor += 1
  }
  return picked
}
