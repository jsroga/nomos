/**
 * One-off episode fixture dump. Tests never import this; scorers read the
 * frozen files under evals/fixtures/<world>/ and never open the database.
 *
 *   npx tsx evals/scripts/export-episode.ts
 */

import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import * as dotenv from 'dotenv'
import { and, asc, eq } from 'drizzle-orm'
import { composeGrrmInstructions } from '@/mastra/agents/grrm-author/compose-instructions'
import { recordFromJson } from '@/shared/data/json-guards'

enum CliFlag {
  ProjectId = '--project-id',
  EpisodeId = '--episode-id',
  World = '--world',
  Out = '--out',
}

enum ExportFile {
  Beats = 'episode-01.beats.json',
  Plan = 'episode-01.plan.json',
  WorldBible = 'world-bible.json',
  Characters = 'characters.json',
  SystemPrompt = 'system-prompt.md',
  Manifest = 'manifest.json',
}

enum GeneratorPath {
  CorkBoardManageBeat = 'cork-board-manage-beat',
}

const DEFAULT_PROJECT_ID = '9b80467c-18b5-4570-9b32-d66f86d71986'
const DEFAULT_EPISODE_ID = 'b694d7a4-47ee-4231-a06e-1a5ae3154a96'
const DEFAULT_WORLD = 'aeternum'
const UNKNOWN_MODEL_ID = 'unknown'
const JSON_INDENT = 2
const PACKED_ACTION_FIELDS = ['actionTaken', 'consequence', 'storyStateChange'] as const

const SYSTEM_PROMPT_SOURCES = [
  'src/mastra/agents/grrm-author/instructions.md',
  'src/mastra/agents/grrm-author/skills/anti-slop/SKILL.md',
  'src/mastra/agents/grrm-author/skills/psychology/SKILL.md',
  'src/domains/storyteller/ai/prompts/guardrails/anti-slop-phrases.ts',
] as const

interface ExportArgs {
  projectId: string
  episodeId: string
  world: string
  outDir: string
}

interface HashedInput {
  path: string
  sha256: string
}

interface PromptSourceFile {
  path: string
  gitSha: string
}

function loadEnv(): void {
  const envPath = resolve(process.cwd(), '.env.local')
  dotenv.config(existsSync(envPath) ? { path: envPath } : undefined)
}

function flagValue(argv: string[], flag: CliFlag, fallback: string): string {
  const index = argv.indexOf(flag)
  if (index < 0) return fallback
  const value = argv[index + 1]
  if (!value || value.startsWith('--')) {
    throw new Error(`Missing value for ${flag}`)
  }
  return value
}

function parseArgs(argv: string[]): ExportArgs {
  const world = flagValue(argv, CliFlag.World, DEFAULT_WORLD)
  const defaultOut = join('evals', 'fixtures', world)
  return {
    projectId: flagValue(argv, CliFlag.ProjectId, DEFAULT_PROJECT_ID),
    episodeId: flagValue(argv, CliFlag.EpisodeId, DEFAULT_EPISODE_ID),
    world,
    outDir: resolve(process.cwd(), flagValue(argv, CliFlag.Out, defaultOut)),
  }
}

function jsonReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Date) return value.toISOString()
  return value
}

function writeJson(filePath: string, value: unknown): void {
  writeFileSync(filePath, `${JSON.stringify(value, jsonReplacer, JSON_INDENT)}\n`)
}

function sha256File(filePath: string): string {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex')
}

function gitShaForFile(repoPath: string): string {
  const commit = execFileSync('git', ['log', '-1', '--format=%H', '--', repoPath], {
    encoding: 'utf8',
  }).trim()
  if (commit.length > 0) return commit
  return execFileSync('git', ['hash-object', repoPath], { encoding: 'utf8' }).trim()
}

function gitHead(): string {
  return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
}

function hashedInput(outDir: string, relativePath: ExportFile): HashedInput {
  return { path: relativePath, sha256: sha256File(join(outDir, relativePath)) }
}

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (value instanceof Date) return Number.isNaN(value.getTime())
  if (typeof value === 'string') return value.length === 0
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

function emptyCountsForBeats(rows: ReadonlyArray<Record<string, unknown>>): Record<string, number> {
  const counts: Record<string, number> = {}
  const first = rows[0]
  const fields = first ? Object.keys(first) : []
  for (const field of fields) counts[field] = 0
  for (const packed of PACKED_ACTION_FIELDS) counts[`setupsPayoffs.${packed}`] = 0

  for (const row of rows) {
    for (const field of fields) {
      if (isEmptyValue(row[field])) counts[field] += 1
    }
    const packed = recordFromJson(row.setupsPayoffs)
    for (const field of PACKED_ACTION_FIELDS) {
      if (isEmptyValue(packed[field])) counts[`setupsPayoffs.${field}`] += 1
    }
  }
  return counts
}

function printEmptyReport(beatCount: number, counts: Record<string, number>): void {
  process.stdout.write(`beatCount: ${beatCount}\n`)
  process.stdout.write('emptyCounts:\n')
  for (const [field, count] of Object.entries(counts)) {
    process.stdout.write(`  ${field}: ${count}\n`)
  }
}

function worldBibleFromSources(seriesBible: unknown, storyPlan: unknown): Record<string, unknown> {
  const plan = recordFromJson(storyPlan)
  return {
    seriesBible,
    worldDescription: plan.worldDescription ?? null,
    worldRules: plan.worldRules ?? [],
    items: plan.items ?? [],
    events: plan.events ?? [],
    factions: plan.factions ?? [],
  }
}

async function main(): Promise<void> {
  loadEnv()
  const args = parseArgs(process.argv.slice(2))

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required (set it in .env.local)')
  }

  const { db } = await import('@/db/client')
  const { beats, characters, episodes, projects } = await import('@/db/schema')

  const [project] = await db.select().from(projects).where(eq(projects.id, args.projectId))
  if (!project) {
    throw new Error(`Project not found: ${args.projectId}`)
  }

  const [episode] = await db
    .select()
    .from(episodes)
    .where(and(eq(episodes.id, args.episodeId), eq(episodes.projectId, args.projectId)))
  if (!episode) {
    throw new Error(`Episode not found for project: ${args.episodeId}`)
  }

  const beatRows = await db
    .select()
    .from(beats)
    .where(eq(beats.episodeId, args.episodeId))
    .orderBy(asc(beats.sequence))
  if (beatRows.length === 0) {
    throw new Error(`No beats for episode ${args.episodeId}`)
  }

  const characterRows = await db
    .select()
    .from(characters)
    .where(eq(characters.projectId, args.projectId))

  mkdirSync(args.outDir, { recursive: true })

  writeJson(join(args.outDir, ExportFile.Beats), beatRows)
  writeJson(join(args.outDir, ExportFile.Plan), {
    id: episode.id,
    projectId: episode.projectId,
    sequence: episode.sequence,
    title: episode.title,
    premise: episode.premise,
    thematicFocus: episode.thematicFocus,
    summary: episode.summary,
    tenPointsPlan: episode.tenPointsPlan,
    storyPlan: episode.storyPlan,
    planApproved: episode.planApproved,
    currentPhase: episode.currentPhase,
    status: episode.status,
  })
  writeJson(
    join(args.outDir, ExportFile.WorldBible),
    worldBibleFromSources(project.seriesBible, episode.storyPlan),
  )
  writeJson(join(args.outDir, ExportFile.Characters), characterRows)
  writeFileSync(join(args.outDir, ExportFile.SystemPrompt), composeGrrmInstructions())

  const sourceFiles: PromptSourceFile[] = SYSTEM_PROMPT_SOURCES.map(path => ({
    path,
    gitSha: gitShaForFile(path),
  }))
  const instructionsSource = sourceFiles[0]
  if (!instructionsSource) {
    throw new Error('SYSTEM_PROMPT_SOURCES is empty')
  }

  const manifest = {
    world: args.world,
    projectId: args.projectId,
    episodeId: args.episodeId,
    exportedAt: new Date().toISOString(),
    exportedFromCommit: gitHead(),
    beatCount: beatRows.length,
    generatorPath: GeneratorPath.CorkBoardManageBeat,
    modelId: UNKNOWN_MODEL_ID,
    usableForModelComparison: false,
    inputs: {
      episodePlan: hashedInput(args.outDir, ExportFile.Plan),
      worldBible: hashedInput(args.outDir, ExportFile.WorldBible),
      characters: hashedInput(args.outDir, ExportFile.Characters),
      systemPrompt: {
        path: ExportFile.SystemPrompt,
        sha256: sha256File(join(args.outDir, ExportFile.SystemPrompt)),
        gitSha: instructionsSource.gitSha,
        sourceFiles,
      },
    },
  }
  writeJson(join(args.outDir, ExportFile.Manifest), manifest)

  process.stdout.write(`Exported ${beatRows.length} beats to ${args.outDir}\n`)
  printEmptyReport(
    beatRows.length,
    emptyCountsForBeats(beatRows.map(row => recordFromJson(row))),
  )
  process.exit(0)
}

main().catch(error => {
  const message = error instanceof Error ? error.message : String(error)
  process.stderr.write(`${message}\n`)
  process.exit(1)
})
