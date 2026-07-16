import { readString, recordFromJson } from '@/shared/data/json-guards'
import type { GameDesignPattern } from './memory'

export enum GameDesignPatternCategory {
  LOOP = 'loop',
  MECHANIC = 'mechanic',
  BALANCE = 'balance',
  PROGRESSION = 'progression',
  MONETIZATION = 'monetization',
}

const CATEGORY_VALUES = new Set<string>(Object.values(GameDesignPatternCategory))

export function parseGameDesignPatternCategory(
  value: unknown
): GameDesignPatternCategory {
  const category = readString(value)
  if (category && CATEGORY_VALUES.has(category)) {
    for (const entry of Object.values(GameDesignPatternCategory)) {
      if (entry === category) return entry
    }
  }
  return GameDesignPatternCategory.MECHANIC
}

function splitDelimited(value: unknown, delimiter: string): string[] {
  const raw = readString(value)
  if (!raw) return []
  return raw.split(delimiter).filter(Boolean)
}

export function gameDesignPatternFromVectorRow(input: {
  id: string
  metadata?: unknown
  score?: number
}): GameDesignPattern {
  const metadata = recordFromJson(input.metadata)
  return {
    id: readString(metadata.id) ?? input.id,
    title: readString(metadata.title) ?? '',
    description: readString(metadata.description) ?? '',
    category: parseGameDesignPatternCategory(metadata.category),
    tags: splitDelimited(metadata.tags, ','),
    examples: splitDelimited(metadata.examples, '|||'),
    score: input.score,
  }
}
