import { LoopAnalysisWireField } from '@/domains/loop-creator/constants/loop-analysis-wire'
import {
  readNumber,
  readString,
  recordArrayFromJson,
  recordFromJson,
  stringArrayFromJson,
} from '@/shared/data/json-guards'

export interface LoopGameContext {
  gameGenre: string
  gamePlatform: string
  targetAudience: string
  gameDescription: string
}

export const EMPTY_LOOP_GAME_CONTEXT: LoopGameContext = {
  gameGenre: '',
  gamePlatform: '',
  targetAudience: '',
  gameDescription: '',
}

export function readLoopMetadataName(metadata: unknown): string | undefined {
  return readString(recordFromJson(metadata).name)
}

export function readLoopMetadataVersion(metadata: unknown): string | undefined {
  const record = recordFromJson(metadata)
  return readString(record.version) ?? (readNumber(record.version)?.toString())
}

export function readAnalysisCoreInsight(analysis: unknown): string | undefined {
  return readString(recordFromJson(analysis).coreInsight)
}

export function readAnalysisPillarScores(analysis: unknown): Record<string, number> {
  const pillars = recordFromJson(recordFromJson(analysis).pillarScores)
  const result: Record<string, number> = {}
  for (const [key, value] of Object.entries(pillars)) {
    const score = readNumber(value)
    if (score !== undefined) result[key] = score
  }
  return result
}

export function readAnalysisStringList(
  analysis: unknown,
  key: LoopAnalysisWireField,
): string[] {
  return stringArrayFromJson(recordFromJson(analysis)[key])
}

export function readImportedLoopName(
  metadata: unknown,
  fileName: string,
  jsonExtension: string,
): string {
  const name = readLoopMetadataName(metadata)
  if (name) return name
  if (fileName.endsWith(jsonExtension)) {
    return fileName.slice(0, -jsonExtension.length)
  }
  return fileName
}

export function readGenreFromMetadata(metadata: unknown, joiner: string): string | undefined {
  const genre = recordFromJson(metadata).genre
  const items = stringArrayFromJson(genre)
  if (items.length > 0) return items.join(joiner)
  return readString(genre)
}

export function readDescriptionFromMetadata(metadata: unknown): string | undefined {
  return readString(recordFromJson(metadata).description)
}

export function parseImportedJson(content: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(content)
    const record = recordFromJson(parsed)
    return Object.keys(record).length > 0 ? record : null
  } catch {
    return null
  }
}

export function importedNodesFromJson(value: unknown): Record<string, unknown>[] {
  return recordArrayFromJson(value)
}

export function importedEdgesFromJson(value: unknown): Record<string, unknown>[] {
  return recordArrayFromJson(value)
}
