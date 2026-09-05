import { lookupPromptBody } from '@/domains/storyteller/ai/prompts/registry/prompt-registry-table'
import { StorytellerPromptRegistryId } from '@/domains/storyteller/ai/prompts/registry/prompt-registry-ids'

export const BIBLE_ROADMAP_SEQUENCES_LOG_PREFIX = '[BibleRoadmap] sequences:'

export const BIBLE_ROADMAP_GENERATE_PROMPT = lookupPromptBody(
  StorytellerPromptRegistryId.BibleRoadmapGenerate
)
