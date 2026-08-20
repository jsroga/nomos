import { BeatboardPremiseFieldKey } from '@/domains/storyteller/core/constants/beatboard-premise-validation'
import {
  formatRoadmapList,
  formatRoadmapSlot,
  RoadmapSlotCopy,
} from '@/domains/storyteller/core/utils/roadmap-slot'
import { ContextPremiseExtraField } from '@/domains/storyteller/services/constants/context-assembly'
import {
  STORY_CANON_NOT_SET,
  StoryCanonPackJoin,
  StoryCanonPackJson,
  StoryCanonPackLabel,
  StoryCanonPackLimit,
} from '@/domains/storyteller/services/constants/story-canon-pack'
import type {
  OpenEpisodeCanon,
  StoryCanonCastMember,
  StoryCanonPack,
} from '@/domains/storyteller/services/story-canon-pack'
import { readString } from '@/shared/data/json-guards'

function clip(value: string, max: number): string {
  if (value.length <= max) return value
  return value.slice(0, max)
}

function joinNonEmpty(parts: Array<string | null | undefined>, separator: string): string {
  return parts
    .map(part => part?.trim() ?? '')
    .filter(part => part.length > 0)
    .join(separator)
}

function labeled(label: StoryCanonPackLabel, body: string): string {
  return `${label}:${StoryCanonPackJoin.Line}${body || StoryCanonPackLabel.None}`
}

function bibleText(pack: StoryCanonPack): string {
  const raw = JSON.stringify(pack.bible)
  if (!raw || raw === StoryCanonPackJson.EmptyObject) return ''
  return clip(raw, StoryCanonPackLimit.BibleChars)
}

function episodeIndexBlock(pack: StoryCanonPack): string {
  return pack.episodeIndex
    .map(row => {
      const title = row.title.trim()
      const logline = row.logline.trim()
      if (title && logline) return `${row.sequence}. ${title}: ${logline}`
      if (title) return `${row.sequence}. ${title}`
      if (logline) return `${row.sequence}. ${logline}`
      return ''
    })
    .filter(line => line.length > 0)
    .join(StoryCanonPackJoin.Line)
}

function castLine(member: StoryCanonCastMember): string {
  const head = `${member.name} (${member.role})`
  const details = joinNonEmpty(
    [
      member.description,
      member.motivation ? `${StoryCanonPackJoin.MotivationPrefix}${member.motivation}` : '',
    ],
    StoryCanonPackJoin.CastField
  )
  return details ? `${head}${StoryCanonPackJoin.CastField}${details}` : head
}

export function hasUsableCanonPack(pack: StoryCanonPack): boolean {
  if (Object.keys(pack.bible).length > 0) return true
  if (pack.roadmap.length > 0) return true
  if (pack.worldDescription.length > 0) return true
  if (pack.genre.length > 0 && pack.genre !== STORY_CANON_NOT_SET) return true
  return pack.episodeIndex.some(row => row.title.length > 0 || row.logline.length > 0)
}

export function formatCanonForTextFill(pack: StoryCanonPack): string {
  const roadmap = formatRoadmapList(pack.roadmap)
  const cast = pack.cast.map(castLine).join(StoryCanonPackJoin.Line)
  return [
    labeled(StoryCanonPackLabel.Bible, bibleText(pack)),
    labeled(StoryCanonPackLabel.SeasonRoadmap, roadmap),
    labeled(StoryCanonPackLabel.EpisodeIndex, episodeIndexBlock(pack)),
    labeled(StoryCanonPackLabel.Cast, cast),
  ].join(StoryCanonPackJoin.Block)
}

export function formatCanonVisualLock(pack: StoryCanonPack): string {
  const lock = joinNonEmpty(
    [
      pack.genre ? `${StoryCanonPackLabel.Genre}: ${pack.genre}` : '',
      pack.tone ? `${StoryCanonPackLabel.Tone}: ${pack.tone}` : '',
      pack.worldDescription ? `${StoryCanonPackLabel.World}: ${pack.worldDescription}` : '',
    ],
    StoryCanonPackJoin.Sentence
  )
  return clip(lock, StoryCanonPackLimit.VisualLockChars)
}

function premiseLockLine(canon: OpenEpisodeCanon): string {
  const logline = readString(canon.premise[BeatboardPremiseFieldKey.Logline])
  const hook = readString(canon.premise[BeatboardPremiseFieldKey.ProtagonistHook])
  const title = readString(canon.premise[ContextPremiseExtraField.Title])
  const theme =
    canon.thematicFocus ||
    readString(canon.premise[ContextPremiseExtraField.ThematicQuestion])
  return joinNonEmpty(
    [
      title,
      logline ? `${StoryCanonPackLabel.Logline}: ${logline}` : '',
      hook ? `${StoryCanonPackLabel.ProtagonistHook}: ${hook}` : '',
      theme ? `${StoryCanonPackLabel.Theme}: ${theme}` : '',
    ],
    StoryCanonPackJoin.Sentence
  )
}

export function formatCanonEpisodeLock(canon: OpenEpisodeCanon): string {
  const slotBody = canon.slot
    ? formatRoadmapSlot(canon.slot)
    : `${RoadmapSlotCopy.MissingPrefix}${canon.episodeSequence}${RoadmapSlotCopy.MissingSuffix}`
  const lock = [
    formatCanonVisualLock(canon),
    labeled(StoryCanonPackLabel.Slot, slotBody),
    labeled(StoryCanonPackLabel.Premise, premiseLockLine(canon)),
  ]
    .filter(part => part.trim().length > 0)
    .join(StoryCanonPackJoin.Block)
  return clip(lock, StoryCanonPackLimit.EpisodeLockChars)
}

export function composePosterPrompt(input: {
  visualLock: string
  episodeLock: string
  clientPrompt?: string
}): string {
  const flavor = input.clientPrompt?.trim() ?? ''
  const composed = joinNonEmpty(
    [input.visualLock, input.episodeLock, flavor],
    StoryCanonPackJoin.Sentence
  )
  return clip(composed, StoryCanonPackLimit.PosterChars)
}
