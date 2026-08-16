export enum PromptSituation {
  Political = 'political',
  Intimate = 'intimate',
  Violent = 'violent',
  Procedural = 'procedural',
}

export enum WorldFixtureFile {
  WorldBible = 'world-bible.json',
  Cast = 'cast.json',
  Characters = 'characters.json',
  CanonLexicon = 'canon-lexicon.json',
  SystemPrompt = 'system-prompt.md',
  Manifest = 'manifest.json',
  PromptsIndex = 'prompts/index.json',
}

export const FIXTURES_ROOT = 'evals/fixtures'
export const EXPECTED_PROMPT_COUNT = 8
export const PROMPTS_PER_SITUATION = 2
