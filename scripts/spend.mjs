#!/usr/bin/env node
/**
 * What the models cost, by project and by feature.
 *
 * Not a dashboard: the review's UX principle is that a signal lives where
 * someone already is, and the person asking this question is at a terminal.
 *
 *   npm run spend -- --days 7
 */
import { pathToFileURL } from 'node:url'
import { readFileSync } from 'node:fs'
import pg from 'pg'

const DEFAULT_DAYS = 7
const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 4 })

const CostStatus = {
  Priced: 'priced',
  Unknown: 'unknown',
}

function days() {
  const index = process.argv.indexOf('--days')
  if (index === -1) return DEFAULT_DAYS
  const value = Number(process.argv[index + 1])
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_DAYS
}

function connectionString() {
  const fromEnv = process.env.DATABASE_URL
  if (fromEnv) return fromEnv
  try {
    const line = readFileSync('.env.local', 'utf8')
      .split('\n')
      .find(entry => entry.startsWith('DATABASE_URL='))
    return line?.slice('DATABASE_URL='.length).trim()
  } catch {
    return undefined
  }
}

function table(title, rows, keyLabel) {
  console.log(`\n${title}`)
  if (rows.length === 0) {
    console.log('  (no calls in the window)')
    return
  }
  const width = Math.max(keyLabel.length, ...rows.map(row => String(row.key).length))
  console.log(`  ${keyLabel.padEnd(width)}  ${'calls'.padStart(6)}  ${'cost'.padStart(11)}  tokens`)
  for (const row of rows) {
    console.log(
      `  ${String(row.key).padEnd(width)}  ${String(row.calls).padStart(6)}  ` +
        `${USD.format(row.cost).padStart(11)}  ${row.tokens.toLocaleString()}`
    )
  }
}

/** Rows with cost_status unknown — undervalued, never "$0 cheap". */
export function unknownCostRows(rows) {
  return rows.filter(row => row.cost_status === CostStatus.Unknown)
}

async function main() {
  const url = connectionString()
  if (!url) {
    console.error('DATABASE_URL is not set, and .env.local does not carry one.')
    process.exit(1)
  }

  const window = days()
  const client = new pg.Client({ connectionString: url })
  await client.connect()

  const since = `now() - interval '${window} days'`
  const select = (groupBy) => `
    SELECT ${groupBy} AS key,
           count(*)::int AS calls,
           sum(CASE WHEN cost_status = '${CostStatus.Unknown}' THEN 0 ELSE cost_usd END)::float AS cost,
           sum(prompt_tokens + completion_tokens)::int AS tokens
    FROM llm_calls
    WHERE created_at >= ${since}
    GROUP BY ${groupBy}
    ORDER BY cost DESC NULLS LAST`

  try {
    const byProject = await client.query(select('project_id'))
    const byFeature = await client.query(select('feature'))
    const byModel = await client.query(select('model'))
    const failures = await client.query(
      `SELECT outcome, count(*)::int AS calls FROM llm_calls
       WHERE created_at >= ${since} AND outcome <> 'ok' GROUP BY outcome ORDER BY calls DESC`
    )
    const unknownByModel = await client.query(
      `SELECT model AS key, count(*)::int AS calls,
              sum(prompt_tokens + completion_tokens)::int AS tokens,
              '${CostStatus.Unknown}' AS cost_status
       FROM llm_calls
       WHERE created_at >= ${since} AND cost_status = '${CostStatus.Unknown}'
       GROUP BY model
       ORDER BY tokens DESC`
    )

    console.log(`\nModel spend, last ${window} day(s)`)
    const total = byProject.rows.reduce((sum, row) => sum + (row.cost ?? 0), 0)
    console.log(`  total: ${USD.format(total)} across ${byProject.rows.length} project(s)`)

    table('By project', byProject.rows, 'project')
    table('By feature', byFeature.rows, 'feature')
    table('By model', byModel.rows, 'model')

    const unpriced = unknownCostRows(unknownByModel.rows)
    if (unpriced.length > 0) {
      console.log('\n⚠️  UNPRICED (cost_status=unknown) — the total above is a floor, not the bill')
      for (const row of unpriced) {
        console.log(
          `  ${String(row.key).padEnd(34)} ${String(row.calls).padStart(6)} calls  ${row.tokens} tokens  cost NOT counted`
        )
      }
      console.log('  Add a row for each in src/shared/ai/gateway/constants/pricing.ts')
    }

    if (failures.rows.length > 0) {
      console.log('\nNon-ok outcomes')
      for (const row of failures.rows) console.log(`  ${row.outcome.padEnd(12)} ${row.calls}`)
    }
    console.log('')
  } finally {
    await client.end()
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error.message)
    process.exit(1)
  })
}
