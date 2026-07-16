import {
  namedRecordsFromJson,
  readString,
  recordArrayFromJson,
  recordFromJson,
  stringArrayFromJson,
} from '@/shared/data/json-guards'
import type { SeriesBible, WorldRule } from '@/domains/storyteller/services/context/series-bible'

function worldRuleFromRecord(value: unknown): WorldRule | null {
  const row = recordFromJson(value)
  const name = readString(row.name)
  if (!name) return null
  return {
    name,
    description: readString(row.description) ?? '',
    constraints: stringArrayFromJson(row.constraints),
    examples: stringArrayFromJson(row.examples),
    rule: readString(row.rule),
    consequence: readString(row.consequence),
  }
}

function worldRulesFromJson(value: unknown): WorldRule[] {
  return recordArrayFromJson(value)
    .map(worldRuleFromRecord)
    .filter((rule): rule is WorldRule => rule !== null)
}

function settingFromRecord(value: unknown): SeriesBible['setting'] {
  const row = recordFromJson(value)
  return {
    time: readString(row.time) ?? '',
    place: readString(row.place) ?? '',
    socialContext: readString(row.socialContext) ?? '',
  }
}

const EMPTY_SERIES_BIBLE: SeriesBible = {
  title: '',
  logline: '',
  premise: '',
  genre: [],
  tone: [],
  centralTheme: '',
  thematicQuestion: '',
  thematicElements: [],
  setting: { time: '', place: '', socialContext: '' },
  worldRules: [],
  characterArcs: [],
  toneGuidelines: {
    violence: '',
    humor: '',
    romance: '',
    dialogue: '',
  },
  visualMotifs: [],
  colorPalette: [],
  cinematicInfluences: [],
  worldDescription: '',
  inspirations: { books: [], movies: [], games: [] },
  moodSoundtrack: '',
  moodImages: [],
}

export function seriesBibleFromRecord(raw: Record<string, unknown>): SeriesBible {
  const partial = recordFromJson(raw)
  return {
    ...EMPTY_SERIES_BIBLE,
    title: readString(partial.title) ?? EMPTY_SERIES_BIBLE.title,
    logline: readString(partial.logline) ?? EMPTY_SERIES_BIBLE.logline,
    premise: readString(partial.premise) ?? EMPTY_SERIES_BIBLE.premise,
    genre: stringArrayFromJson(partial.genre),
    tone: stringArrayFromJson(partial.tone),
    centralTheme: readString(partial.centralTheme) ?? EMPTY_SERIES_BIBLE.centralTheme,
    thematicQuestion:
      readString(partial.thematicQuestion) ?? EMPTY_SERIES_BIBLE.thematicQuestion,
    worldDescription:
      readString(partial.worldDescription) ?? EMPTY_SERIES_BIBLE.worldDescription,
    moodSoundtrack: readString(partial.moodSoundtrack) ?? EMPTY_SERIES_BIBLE.moodSoundtrack,
    moodImages: stringArrayFromJson(partial.moodImages),
    setting: Object.keys(recordFromJson(partial.setting)).length
      ? settingFromRecord(partial.setting)
      : EMPTY_SERIES_BIBLE.setting,
    worldRules: worldRulesFromJson(partial.worldRules),
    factions: namedRecordsFromJson(partial.factions),
    updatedFields: recordFromJson(partial.updatedFields),
  }
}

export function mergeWorldRules(...sources: unknown[]): WorldRule[] {
  for (const source of sources) {
    const rules = worldRulesFromJson(source)
    if (rules.length > 0) return rules
  }
  return []
}

export function mergeNamedRecords(...sources: unknown[]) {
  for (const source of sources) {
    const rows = namedRecordsFromJson(source)
    if (rows.length > 0) return rows
  }
  return []
}
