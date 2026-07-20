/**
 * Terminal probe for the storyteller beat-draft orchestration.
 *
 * Runs plan → draft → critics → revise once (autoApprove, no human gate) and
 * prints the final draft + critiques. The fastest way to confirm the Mastra
 * pipeline works end-to-end from a shell.
 *
 * Usage:
 *   STORYTELLER_PROJECT_ID=... STORYTELLER_EPISODE_ID=... \
 *     npx tsx scripts/storyteller-orchestrate.ts "your beat brief here"
 *
 * Needs: DATABASE_URL + an LLM key (author + critic), and a real project/episode.
 */

import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
import { Mastra } from '@mastra/core/mastra'
import {
  createBeatDraftWorkflow,
  defaultBeatDraftDeps,
} from '@/domains/storyteller/ai/workflows/beat-draft-workflow'
import { beatDraftOutputSchema } from '@/domains/storyteller/ai/workflows/beat-draft-contract'

function loadEnv(): void {
  const envPath = path.resolve(process.cwd(), '.env.local')
  dotenv.config(fs.existsSync(envPath) ? { path: envPath } : undefined)
}

const DEFAULT_BRIEF =
  'Vera confronts Marcus in the chapel about the forged ledger; the confession must implicate Vera herself by the end.'

function hasLlmKey(): boolean {
  return Boolean(
    process.env.MOONSHOT_API_KEY ||
      process.env.ANTHROPIC_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.JUDGING_MODEL
  )
}

async function main(): Promise<void> {
  loadEnv()

  const projectId = process.env.STORYTELLER_PROJECT_ID
  const episodeId = process.env.STORYTELLER_EPISODE_ID
  if (!process.env.DATABASE_URL || !hasLlmKey() || !projectId || !episodeId) {
    console.error(
      'storyteller-orchestrate: needs DATABASE_URL, an LLM key, STORYTELLER_PROJECT_ID, and STORYTELLER_EPISODE_ID.'
    )
    process.exit(1)
  }

  const brief = process.argv[2] ?? DEFAULT_BRIEF
  console.log(`\n> brief: ${brief}\n> running beat-draft workflow (autoApprove)…\n`)

  const workflow = createBeatDraftWorkflow(defaultBeatDraftDeps)
  void new Mastra({ workflows: { beatDraftWorkflow: workflow } })
  const run = await workflow.createRun()
  const result = await run.start({
    inputData: { projectId, episodeId, brief, characters: [], autoApprove: true },
  })

  if (result.status !== 'success') {
    console.error('run did not succeed:', result.status)
    process.exit(1)
  }

  const output = beatDraftOutputSchema.parse(result.result)
  console.log('=== FINAL DRAFT ===\n')
  console.log(output.finalDraft)
  console.log('\n=== CRITIQUES ===\n')
  console.log(output.critiques)
  console.log(`\n=== ${output.saved ? 'saved' : 'not saved'}${output.killed ? ' · KILLED' : ''} ===`)
}

void main()
