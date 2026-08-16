/**
 * Load a frozen comparison world from evals/fixtures/<world>/.
 * A second world is a sibling directory; this file does not name worlds.
 */

import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { recordFromJson, readString, stringArrayFromJson } from '@/shared/data/json-guards'
import {
  FIXTURES_ROOT,
  PromptSituation,
  WorldFixtureFile,
} from './constants'
import type { ComparisonPrompt, WorldFixture } from './types'

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function situationFromUnknown(value: unknown): PromptSituation | null {
  if (value === PromptSituation.Political) return PromptSituation.Political
  if (value === PromptSituation.Intimate) return PromptSituation.Intimate
  if (value === PromptSituation.Violent) return PromptSituation.Violent
  if (value === PromptSituation.Procedural) return PromptSituation.Procedural
  return null
}

export function comparisonPromptFromUnknown(value: unknown): ComparisonPrompt | null {
  const row = recordFromJson(value)
  const id = readString(row.id)
  const situation = situationFromUnknown(row.situation)
  const title = readString(row.title)
  const priorStoryState = readString(row.priorStoryState)
  const brief = readString(row.brief)
  const beatType = readString(row.beatType)
  if (!id || !situation || !title || !priorStoryState || !brief || !beatType) return null
  return {
    id,
    situation,
    title,
    priorStoryState,
    brief,
    characters: stringArrayFromJson(row.characters),
    beatType,
  }
}

function promptIndexFiles(raw: unknown): string[] {
  const row = recordFromJson(raw)
  return stringArrayFromJson(row.files)
}

export function loadWorldFixture(world: string, cwd = process.cwd()): WorldFixture {
  const root = resolve(cwd, FIXTURES_ROOT, world)
  if (!existsSync(root)) {
    throw new Error(`missing world fixture directory: ${root}`)
  }
  const promptsDir = join(root, 'prompts')
  const indexRaw = readJson(join(root, WorldFixtureFile.PromptsIndex))
  const files = promptIndexFiles(indexRaw)
  const prompts: ComparisonPrompt[] = []
  for (const name of files) {
    const prompt = comparisonPromptFromUnknown(readJson(join(promptsDir, name)))
    if (!prompt) {
      throw new Error(`invalid comparison prompt: ${name}`)
    }
    prompts.push(prompt)
  }
  return {
    world,
    systemPrompt: readFileSync(join(root, WorldFixtureFile.SystemPrompt), 'utf8'),
    bible: readJson(join(root, WorldFixtureFile.WorldBible)),
    cast: readJson(join(root, WorldFixtureFile.Cast)),
    characters: readJson(join(root, WorldFixtureFile.Characters)),
    lexicon: readJson(join(root, WorldFixtureFile.CanonLexicon)),
    prompts,
  }
}

export function beatDraftBrief(prompt: ComparisonPrompt): string {
  return `${prompt.priorStoryState}\n\n${prompt.brief}`
}
