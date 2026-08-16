import { recordFromJson, readNumber, readString, stringArrayFromJson } from '../../src/shared/data/json-guards'
import {
  PACKED_ACTION_TAKEN,
  PACKED_CONSEQUENCE,
  PACKED_STORY_STATE_CHANGE,
} from './constants'
import type { DumpedBeat } from './types'

function packedField(setupsPayoffs: unknown, key: string): string {
  const packed = recordFromJson(setupsPayoffs)
  const value = packed[key]
  return typeof value === 'string' ? value : ''
}

export function dumpedBeatFromUnknown(value: unknown): DumpedBeat | null {
  const row = recordFromJson(value)
  const id = readString(row.id)
  const episodeId = readString(row.episodeId)
  const sequence = readNumber(row.sequence)
  const logline = readString(row.logline)
  const beatType = readString(row.beatType)
  if (!id || !episodeId || sequence === undefined || !logline || !beatType) return null
  return {
    id,
    episodeId,
    sequence,
    logline,
    beatType,
    content: readString(row.content) ?? '',
    visualHook: readString(row.visualHook) ?? '',
    charactersInvolved: stringArrayFromJson(row.charactersInvolved),
    emotionalShifts: row.emotionalShifts,
    causalDependencies: stringArrayFromJson(row.causalDependencies),
    setupsPayoffs: recordFromJson(row.setupsPayoffs),
    actionTaken: packedField(row.setupsPayoffs, PACKED_ACTION_TAKEN),
    consequence: packedField(row.setupsPayoffs, PACKED_CONSEQUENCE),
    storyStateChange: packedField(row.setupsPayoffs, PACKED_STORY_STATE_CHANGE),
    status: readString(row.status) ?? '',
    imageUrl: readString(row.imageUrl) ?? null,
    imagePrompt: readString(row.imagePrompt) ?? null,
  }
}

export function beatProse(beat: DumpedBeat): string {
  return [
    beat.logline,
    beat.visualHook,
    beat.content,
    beat.actionTaken,
    beat.consequence,
    beat.storyStateChange,
    beat.charactersInvolved.join(' '),
  ]
    .filter(part => part.length > 0)
    .join(' ')
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 0)
}

export function tokenCount(text: string): number {
  return tokenize(text).length
}
