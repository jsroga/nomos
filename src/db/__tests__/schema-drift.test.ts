import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Schema drift — a table in the database with no TypeScript definition.
 *
 * `supabase/migrations/` is the real schema: it was hand-written, and
 * `src/db/schema-parts/` is a mirror maintained by hand, so nothing has ever
 * checked that the two agree. A table missing from Drizzle gets reached through
 * the untyped Supabase client instead, which is how the app ended up with two
 * schema idioms and two type stories.
 *
 * Compares table *names* only, and needs no database connection. Column-level
 * drift needs `drizzle-kit`, which cannot be used until the two migration
 * histories are reconciled — see docs/DECISIONS.md ADR 0001.
 */
const REPO_ROOT = path.resolve(__dirname, '../../..')
const MIGRATIONS_DIR = path.join(REPO_ROOT, 'supabase/migrations')
const SCHEMA_DIR = path.join(REPO_ROOT, 'src/db/schema-parts')

/**
 * Tables that exist in SQL and deliberately have no Drizzle definition.
 * This is a ratchet, not an allowlist: entries may be removed, never added.
 */
const UNMODELLED_TABLES = new Set([
  // Reached only through the Supabase client, where RLS applies (ADR 0001).
  'api_keys',
  // Written by an early migration; no code reads it today.
  'character_state_snapshots',
])

/** Words that can follow CREATE TABLE without being a table name. */
const SQL_KEYWORDS = new Set(['as', 'if', 'not', 'exists'])

/** Strip comments so commented-out DDL is not mistaken for a real table. */
function activeSql(text: string): string {
  return text
    .split('\n')
    .filter(line => !line.trimStart().startsWith('--'))
    .join('\n')
}

function sqlTables(): Set<string> {
  const tables = new Set<string>()
  for (const file of fs.readdirSync(MIGRATIONS_DIR)) {
    if (!file.endsWith('.sql')) continue
    const sql = activeSql(fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8'))
    for (const match of sql.matchAll(
      /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?"?([a-z_][a-z0-9_]*)"?/gi
    )) {
      const name = match[1].toLowerCase()
      // `CREATE TABLE x AS SELECT …` — `AS` is syntax, not a table.
      if (SQL_KEYWORDS.has(name)) continue
      tables.add(name)
    }
  }
  return tables
}

function drizzleTables(): Set<string> {
  const tables = new Set<string>()
  for (const file of fs.readdirSync(SCHEMA_DIR)) {
    if (!file.endsWith('.ts')) continue
    const source = fs.readFileSync(path.join(SCHEMA_DIR, file), 'utf8')
    // Multiline-aware: the table name is often on the line after `pgTable(`.
    for (const match of source.matchAll(/pgTable\(\s*['"]([a-z_][a-z0-9_]*)['"]/g)) {
      tables.add(match[1])
    }
  }
  return tables
}

describe('schema drift', () => {
  const sql = sqlTables()
  const drizzle = drizzleTables()

  it('finds tables on both sides', () => {
    expect(sql.size).toBeGreaterThan(20)
    expect(drizzle.size).toBeGreaterThan(20)
  })

  it('every SQL table is modelled in Drizzle, or explicitly unmodelled', () => {
    const missing = [...sql].filter(t => !drizzle.has(t) && !UNMODELLED_TABLES.has(t)).sort()
    expect(
      missing,
      `Tables exist in supabase/migrations with no Drizzle definition:\n  ${missing.join('\n  ')}\n` +
        'Add them to src/db/schema-parts/, or to UNMODELLED_TABLES with a reason.'
    ).toEqual([])
  })

  it('every Drizzle table exists in SQL', () => {
    const orphaned = [...drizzle].filter(t => !sql.has(t)).sort()
    expect(
      orphaned,
      `Drizzle defines tables that no migration creates:\n  ${orphaned.join('\n  ')}`
    ).toEqual([])
  })

  it('UNMODELLED_TABLES has no stale entries', () => {
    const stale = [...UNMODELLED_TABLES].filter(t => !sql.has(t) || drizzle.has(t)).sort()
    expect(stale, `Stale entries — remove them:\n  ${stale.join('\n  ')}`).toEqual([])
  })
})
