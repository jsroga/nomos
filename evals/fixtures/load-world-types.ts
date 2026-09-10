import type { PromptSituation } from './load-world-constants'

export interface ComparisonPrompt {
  id: string
  situation: PromptSituation
  title: string
  priorStoryState: string
  brief: string
  characters: string[]
  beatType: string
}

export interface WorldFixture {
  world: string
  systemPrompt: string
  bible: unknown
  cast: unknown
  characters: unknown
  lexicon: unknown
  prompts: ComparisonPrompt[]
}
