import type { BeatCastExtract } from '@/domains/storyteller/ai/prompts/schemas/beat-cast-extract-schema'
import {
  buildBeatCastExtractPrompt,
  matchCastByExtractedNames,
  type BeatCastMember,
} from '@/domains/storyteller/services/constants/beat-cast-extract'

export type { BeatCastMember }

export type BeatCastExtractFn = (prompt: string) => Promise<BeatCastExtract | null>

export interface ExtractVisibleBeatCastInput {
  beatText: string
  roster: readonly BeatCastMember[]
  hintedNames: readonly string[]
  extract?: BeatCastExtractFn
}

async function defaultExtract(prompt: string): Promise<BeatCastExtract | null> {
  const { extractBeatCastNames } = await import(
    '@/domains/storyteller/ai/agents/BeatCastExtract/beat-cast-extract-agent'
  )
  return extractBeatCastNames(prompt)
}

export async function extractVisibleBeatCast(
  input: ExtractVisibleBeatCastInput,
): Promise<BeatCastMember[]> {
  const roster = [...input.roster]
  if (roster.length === 0) return []

  const hintedMatched = matchCastByExtractedNames(input.hintedNames, roster)
  const beatText = input.beatText.trim()
  if (beatText.length === 0) return hintedMatched

  const extract = input.extract ?? defaultExtract
  try {
    const parsed = await extract(
      buildBeatCastExtractPrompt({
        beatText,
        rosterNames: roster.map(member => member.name),
        hintedNames: [...input.hintedNames],
      }),
    )
    if (!parsed) return hintedMatched
    if (parsed.names.length === 0) return []
    const matched = matchCastByExtractedNames(parsed.names, roster)
    return matched.length > 0 ? matched : hintedMatched
  } catch {
    return hintedMatched
  }
}
