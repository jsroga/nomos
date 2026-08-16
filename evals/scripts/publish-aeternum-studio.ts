/**
 * Persist the frozen Aeternum episode as a Mastra Dataset experiment.
 * Does not overwrite evals/baselines/*.json. Does not call beat-draft.
 *
 *   npx tsx evals/scripts/publish-aeternum-studio.ts
 */

import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as dotenv from 'dotenv'
import { recordFromJson, stringArrayFromJson } from '@/shared/data/json-guards'
import { createMastra, createPostgresStore } from '@/shared/agent-kernel/mastra/create-mastra'
import { STRUCTURAL_EXPERIMENT_SCORERS } from '../structural/mastra-scorers'

const WORLD_DIR = resolve(process.cwd(), 'evals/fixtures/aeternum')
const CORPUS_PATH = resolve(process.cwd(), 'evals/fixtures/structural/negative-corpus.json')
const BASELINE_PATH = 'evals/baselines/aeternum-episode-01.2026-08-16.json'
const DATASET_NAME = 'aeternum-episode-01'
const EXPERIMENT_NAME = 'aeternum-episode-01-2026-08-16'
const STUDIO_URL = 'http://localhost:4111'
const ENV_LOCAL = resolve(process.cwd(), '.env.local')

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function planPointsFromFrozenPlan(plan: unknown): string[] {
  const premise = recordFromJson(recordFromJson(recordFromJson(plan).storyPlan).premise)
  return stringArrayFromJson(premise.tenPointsPlan).filter(item => item.length > 0)
}

function corpusPhrases(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.filter(item => typeof item === 'string') : stringArrayFromJson(raw)
}

function sha256File(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

async function main(): Promise<void> {
  dotenv.config(existsSync(ENV_LOCAL) ? { path: ENV_LOCAL } : undefined)
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to publish scores to Studio storage')
  }

  const beatsRaw = readJson(resolve(WORLD_DIR, 'episode-01.beats.json'))
  const planRaw = readJson(resolve(WORLD_DIR, 'episode-01.plan.json'))
  const lexiconRaw = readJson(resolve(WORLD_DIR, 'canon-lexicon.json'))
  const castRaw = readJson(resolve(WORLD_DIR, 'cast.json'))
  const corpusRaw = readJson(CORPUS_PATH)
  const lexicon = recordFromJson(lexiconRaw)
  const input = {
    planPoints: planPointsFromFrozenPlan(planRaw),
    lexicon: lexiconRaw,
    cast: castRaw,
    corpus: corpusPhrases(corpusRaw),
    matchingRules: lexicon.matching,
  }

  const mastra = createMastra({}, { storage: createPostgresStore() })
  const listed = await mastra.datasets.list({
    perPage: 50,
    filters: { name: DATASET_NAME },
  })
  const existing = listed.datasets.find(row => row.name === DATASET_NAME)
  const dataset = existing
    ? await mastra.datasets.get({ id: existing.id })
    : await mastra.datasets.create({
        name: DATASET_NAME,
        description: 'Frozen Aeternum episode-01 beats for structural baseline scoring',
        scorerIds: STRUCTURAL_EXPERIMENT_SCORERS.map(scorer => scorer.id),
      })

  const listedItems = await dataset.listItems({ page: 0, perPage: 5 })
  const items = Array.isArray(listedItems) ? listedItems : listedItems.items
  if (items.length === 0) {
    await dataset.addItem({
      input,
      metadata: {
        baselinePath: BASELINE_PATH,
        fixtureSha: sha256File(resolve(WORLD_DIR, 'episode-01.beats.json')),
      },
    })
  }

  const summary = await dataset.startExperiment({
    name: EXPERIMENT_NAME,
    description: 'Identity-task structural baseline; no LLM, no beat-draft',
    task: () => beatsRaw,
    scorers: [...STRUCTURAL_EXPERIMENT_SCORERS],
    metadata: {
      baselinePath: BASELINE_PATH,
      fixtureSha: sha256File(resolve(WORLD_DIR, 'episode-01.beats.json')),
    },
  })

  process.stdout.write(
    `experimentId=${summary.experimentId}\nStudio Experiments: ${STUDIO_URL}\nstatus=${summary.status}\n`,
  )
}

main().catch(error => {
  const err = error instanceof Error ? error : new Error(String(error))
  process.stderr.write(`${err.stack ?? err.message}\n`)
  process.exit(1)
})
