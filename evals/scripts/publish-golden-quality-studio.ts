/**
 * Persist golden hallucination/magic items as a Mastra Dataset experiment.
 * Task returns frozen referenceOutput (judge wiring, same as `npm run eval`).
 * Does not call the chat agent. Does not touch the Aeternum identity experiment.
 *
 * Load `.env.local` before importing scorers — judge models read OPENROUTER_API_KEY
 * at module load.
 *
 *   npx tsx evals/scripts/publish-golden-quality-studio.ts
 */

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import * as dotenv from 'dotenv'
import { STORYTELLER_GOLDEN_EXAMPLES } from '../datasets/storyteller-golden'
import {
  GOLDEN_QUALITY_SCORER_IDS,
  GoldenQualityItemMeta,
  goldenQualityTaskOutput,
  selectGoldenQualityExamples,
} from '../golden-quality-items'

const DATASET_NAME = 'storyteller-golden-quality'
const EXPERIMENT_NAME = 'golden-hallucination-magic'
const DATASET_DESCRIPTION =
  'Golden hallucination and magic items; frozen referenceOutput for LLM judges'
const EXPERIMENT_DESCRIPTION =
  'Judge wiring on frozen golden outputs; no live agent call'
const STUDIO_URL = 'http://localhost:4111'
const ENV_LOCAL = resolve(process.cwd(), '.env.local')
const DATABASE_URL_REQUIRED = 'DATABASE_URL is required to publish scores to Studio storage'
const OPENROUTER_KEY_REQUIRED = 'OPENROUTER_API_KEY is required for hallucination/magic judges'
const EXPERIMENT_MAX_CONCURRENCY = 2
const LIST_PAGE_SIZE = 50

async function main(): Promise<void> {
  dotenv.config(existsSync(ENV_LOCAL) ? { path: ENV_LOCAL } : undefined)
  if (!process.env.DATABASE_URL) {
    throw new Error(DATABASE_URL_REQUIRED)
  }
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error(OPENROUTER_KEY_REQUIRED)
  }

  const { registerCorePrompts } = await import('@/shared/agent-kernel/prompts/registry')
  const { createMastra, createPostgresStore } = await import(
    '@/shared/agent-kernel/mastra/create-mastra'
  )

  const examples = selectGoldenQualityExamples(STORYTELLER_GOLDEN_EXAMPLES)
  registerCorePrompts()
  const mastra = createMastra({}, { storage: createPostgresStore() })
  const listed = await mastra.datasets.list({
    perPage: LIST_PAGE_SIZE,
    filters: { name: DATASET_NAME },
  })
  const existing = listed.datasets.find(row => row.name === DATASET_NAME)
  const dataset = existing
    ? await mastra.datasets.get({ id: existing.id })
    : await mastra.datasets.create({
        name: DATASET_NAME,
        description: DATASET_DESCRIPTION,
        scorerIds: [...GOLDEN_QUALITY_SCORER_IDS],
      })

  const listedItems = await dataset.listItems({ page: 0, perPage: LIST_PAGE_SIZE })
  const items = Array.isArray(listedItems) ? listedItems : listedItems.items
  if (items.length === 0) {
    await dataset.addItems({
      items: examples.map(example => ({
        externalId: example.id,
        input: example.input,
        groundTruth: example.input.canon,
        scorerIds: [...example.metadata.scorers],
        metadata: {
          [GoldenQualityItemMeta.ExampleId]: example.id,
          [GoldenQualityItemMeta.Category]: example.metadata.category,
          [GoldenQualityItemMeta.Description]: example.metadata.description,
          [GoldenQualityItemMeta.ReferenceOutput]: example.referenceOutput,
        },
      })),
    })
  }

  // Omit run-level scorers so each item uses its own scorerIds (hallucination vs magic).
  const summary = await dataset.startExperiment({
    name: EXPERIMENT_NAME,
    description: EXPERIMENT_DESCRIPTION,
    task: ({ metadata }) => goldenQualityTaskOutput(metadata),
    maxConcurrency: EXPERIMENT_MAX_CONCURRENCY,
  })

  const scoreLines = summary.results.flatMap(item =>
    item.scores.map(score =>
      `${score.scorerId}=${score.score ?? 'null'}${score.error ? ` error=${score.error}` : ''}`,
    ),
  )
  process.stdout.write(
    `experimentId=${summary.experimentId}\nStudio Experiments: ${STUDIO_URL}\nstatus=${summary.status}\nscores=${scoreLines.join(',')}\n`,
  )
}

main().catch(error => {
  const err = error instanceof Error ? error : new Error(String(error))
  process.stderr.write(`${err.stack ?? err.message}\n`)
  process.exit(1)
})
