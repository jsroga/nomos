/**
 * Create-or-get the git-backed live quality dataset in Studio.
 * Never mix with storyteller-golden-quality. Default experiment target is
 * grrm-author generate — not beat-draft-workflow (that persists beats).
 *
 *   npx tsx evals/tools/publish-live-quality-studio.ts
 */

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import * as dotenv from 'dotenv'
import {
  LIVE_QUALITY_DATASET_NAME,
  LIVE_QUALITY_DEFAULT_SCORERS,
  LIVE_QUALITY_VERSION,
  STORYTELLER_LIVE_QUALITY_EXAMPLES,
} from '../datasets/storyteller-live-quality'
import { HourLoopTarget } from '@/shared/agent-kernel/mastra/quality-improver/constants'

const EXPERIMENT_NAME = 'live-quality-git-snapshot'
const DATASET_DESCRIPTION =
  'Live writer briefs; inputs only. Git is the source of items. No golden referenceOutput.'
const EXPERIMENT_DESCRIPTION = 'Live grrm-author generate on git snapshot; no beat persist'
const STUDIO_URL = 'http://localhost:4111'
const ENV_LOCAL = resolve(process.cwd(), '.env.local')
const DATABASE_URL_REQUIRED = 'DATABASE_URL is required to publish the live dataset to Studio'
const OPENROUTER_KEY_REQUIRED = 'OPENROUTER_API_KEY is required for live grrm-author generate'
const LIST_PAGE_SIZE = 50
const EXPERIMENT_MAX_CONCURRENCY = 1

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
  const { storytellerRuntimeAgents } = await import(
    '@/domains/storyteller/core/io/mastra-runtime'
  )

  registerCorePrompts()
  const mastra = createMastra(storytellerRuntimeAgents, { storage: createPostgresStore() })
  const listed = await mastra.datasets.list({
    perPage: LIST_PAGE_SIZE,
    filters: { name: LIVE_QUALITY_DATASET_NAME },
  })
  const existing = listed.datasets.find(row => row.name === LIVE_QUALITY_DATASET_NAME)
  const dataset = existing
    ? await mastra.datasets.get({ id: existing.id })
    : await mastra.datasets.create({
        name: LIVE_QUALITY_DATASET_NAME,
        description: DATASET_DESCRIPTION,
        scorerIds: [...LIVE_QUALITY_DEFAULT_SCORERS],
      })

  const listedItems = await dataset.listItems({ page: 0, perPage: LIST_PAGE_SIZE })
  const items = Array.isArray(listedItems) ? listedItems : listedItems.items
  if (items.length === 0) {
    await dataset.addItems({
      items: STORYTELLER_LIVE_QUALITY_EXAMPLES.map(example => ({
        externalId: example.id,
        input: example.input,
        scorerIds: example.metadata.scorers,
        metadata: {
          version: example.version,
          source: example.metadata.source,
          underpowered: example.metadata.underpowered ?? false,
        },
      })),
    })
  }

  const versions = await dataset.listVersions({ page: 0, perPage: 1 })
  const latest = versions.versions[0]
  const summary = await dataset.startExperiment({
    name: EXPERIMENT_NAME,
    description: EXPERIMENT_DESCRIPTION,
    targetType: HourLoopTarget.AgentType,
    targetId: HourLoopTarget.GrrmAuthor,
    scorers: [...LIVE_QUALITY_DEFAULT_SCORERS],
    version: latest?.version ?? LIVE_QUALITY_VERSION,
    maxConcurrency: EXPERIMENT_MAX_CONCURRENCY,
  })

  const scoreLines = summary.results.flatMap(item =>
    item.scores.map(score =>
      `${score.scorerId}=${score.score ?? 'null'}${score.error ? ` error=${score.error}` : ''}`,
    ),
  )
  process.stdout.write(
    `dataset=${LIVE_QUALITY_DATASET_NAME}\nexperimentId=${summary.experimentId}\nStudio Experiments: ${STUDIO_URL}\nstatus=${summary.status}\nscores=${scoreLines.join(',')}\n`,
  )
}

main().catch(error => {
  const err = error instanceof Error ? error : new Error(String(error))
  process.stderr.write(`${err.stack ?? err.message}\n`)
  process.exit(1)
})
