/**
 * Studio Evaluation columns come from experiment.scorerIds. Mastra's
 * startExperiment runner creates the row without pinning that field, so the
 * UI falls back to whichever scores happened to persist.
 */

import { Client } from 'pg'

const PIN_SQL = 'UPDATE mastra_experiments SET "scorerIds" = $1::jsonb WHERE id = $2'
const DATABASE_URL_REQUIRED = 'DATABASE_URL is required to pin experiment scorer ids'

export async function pinExperimentScorerIds(args: {
  experimentId: string
  scorerIds: readonly string[]
}): Promise<void> {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error(DATABASE_URL_REQUIRED)
  }
  const client = new Client({ connectionString })
  await client.connect()
  try {
    await client.query(PIN_SQL, [JSON.stringify([...args.scorerIds]), args.experimentId])
  } finally {
    await client.end()
  }
}
