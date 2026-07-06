/**
 * Push storyteller prompts to Langfuse (remote prompt store).
 *
 * Usage:
 *   npm run prompts:push              # dev environment label
 *   npm run prompts:push:staging      # staging label
 *   npm run prompts:push:prod         # production label
 *
 * Requires LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY in .env.local
 */

import { config } from 'dotenv'
import { pushPromptsToLangfuse } from '@/shared/agent-kernel/prompts/langfuse-sync'
import { STORYTELLER_SYSTEM_PROMPT } from '@/shared/agent-kernel/prompts/registry'
import type { PromptDefinition } from '@/shared/agent-kernel/prompts/types'
import { PROMPT_IDS } from '../config/storyteller-config'
import { CHARACTER_PSYCHOLOGY_PROMPT } from './personas/character-psychology'
import { CONSEQUENCE_TRACKER_PROMPT } from './personas/consequence-tracker'
import { DEVILS_ADVOCATE_PROMPT } from './personas/devils-advocate'
import { EPISODE_PREMISE_PROMPT } from './personas/episode-premise'
import { WRITER_STRUCTURED_PROMPT } from './personas/writer'
import {
  AI_SLOP_BLOCKLIST,
  EXTENDED_THINKING_FRAMEWORK,
  GRRM_GILLIGAN_STANDARDS,
  SELF_CRITIQUE_PROMPT,
} from './extended-thinking'

config({ path: '.env.local' })

type PromptEnvironment = 'dev' | 'staging' | 'production'

function parseEnvironment(argv: string[]): PromptEnvironment {
  if (argv.includes('--production')) return 'production'
  if (argv.includes('--staging')) return 'staging'
  return 'dev'
}

function storytellerPrompt(
  name: string,
  text: string,
  environment: PromptEnvironment,
  extraTags: string[] = []
): PromptDefinition {
  return {
    name,
    version: 1,
    text,
    variables: [],
    tags: ['storyteller', `env:${environment}`, ...extraTags],
  }
}

function collectStorytellerPrompts(environment: PromptEnvironment): PromptDefinition[] {
  return [
    storytellerPrompt(PROMPT_IDS.writer, WRITER_STRUCTURED_PROMPT, environment, ['agent', 'writer']),
    storytellerPrompt(
      PROMPT_IDS.characterPsychology,
      CHARACTER_PSYCHOLOGY_PROMPT,
      environment,
      ['agent', 'psychology']
    ),
    storytellerPrompt(
      PROMPT_IDS.devilsAdvocate,
      DEVILS_ADVOCATE_PROMPT,
      environment,
      ['agent', 'critique']
    ),
    storytellerPrompt(
      PROMPT_IDS.consequenceTracker,
      CONSEQUENCE_TRACKER_PROMPT,
      environment,
      ['agent', 'continuity']
    ),
    storytellerPrompt(
      PROMPT_IDS.episodePremiseArchitect,
      EPISODE_PREMISE_PROMPT,
      environment,
      ['agent', 'premise']
    ),
    storytellerPrompt(
      PROMPT_IDS.planner,
      STORYTELLER_SYSTEM_PROMPT.text,
      environment,
      ['agent', 'planner']
    ),
    storytellerPrompt('storyteller-extended-thinking', EXTENDED_THINKING_FRAMEWORK, environment, [
      'framework',
    ]),
    storytellerPrompt('storyteller-grrm-gilligan-standards', GRRM_GILLIGAN_STANDARDS, environment, [
      'framework',
    ]),
    storytellerPrompt('storyteller-ai-slop-blocklist', AI_SLOP_BLOCKLIST, environment, [
      'guardrail',
    ]),
    storytellerPrompt('storyteller-self-critique', SELF_CRITIQUE_PROMPT, environment, [
      'agent',
      'critique',
    ]),
  ]
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const environment = parseEnvironment(process.argv)

  if (!process.env.LANGFUSE_PUBLIC_KEY || !process.env.LANGFUSE_SECRET_KEY) {
    console.error(
      '[prompts:push] LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY must be set in .env.local'
    )
    process.exit(1)
  }

  const prompts = collectStorytellerPrompts(environment)
  console.log(
    `[prompts:push] Pushing ${prompts.length} storyteller prompts to Langfuse (env: ${environment})`
  )

  const result = await pushPromptsToLangfuse(prompts, {
    dryRun,
    filterTags: ['storyteller'],
  })

  console.log(`[prompts:push] Pushed: ${result.pushed.length}`)
  if (result.skipped.length > 0) {
    console.log(`[prompts:push] Skipped: ${result.skipped.join(', ')}`)
  }
  if (result.errors.length > 0) {
    console.error('[prompts:push] Errors:')
    for (const err of result.errors) {
      console.error(`  - ${err.name}: ${err.error}`)
    }
    process.exit(1)
  }
}

main().catch(error => {
  console.error('[prompts:push] Failed:', error)
  process.exit(1)
})
