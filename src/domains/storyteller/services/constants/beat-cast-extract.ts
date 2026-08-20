import {
  BeatCastExtractPromptLabel,
} from '@/domains/storyteller/ai/agents/BeatCastExtract/constants/beat-cast-extract-agent'

export enum BeatCastMatchLimit {
  FuzzyNameChars = 3,
}

export interface BeatCastMember {
  id: string
  name: string
  portraitUrl?: string
}

export interface BeatExtractTextFields {
  logline?: string
  visualHook?: string
  content?: string
  imagePrompt?: string
  scenePrompt?: string
}

export function normalizeCastName(name: string): string {
  return name.trim().toLowerCase()
}

function pushUniqueText(parts: string[], value: string | undefined): void {
  const trimmed = value?.trim() ?? ''
  if (trimmed.length === 0 || parts.includes(trimmed)) return
  parts.push(trimmed)
}

export function buildBeatExtractText(fields: BeatExtractTextFields): string {
  const parts: string[] = []
  pushUniqueText(parts, fields.logline)
  pushUniqueText(parts, fields.visualHook)
  pushUniqueText(parts, fields.content)
  pushUniqueText(parts, fields.imagePrompt)
  pushUniqueText(parts, fields.scenePrompt)
  return parts.join('\n')
}

export function buildBeatCastExtractPrompt(input: {
  beatText: string
  rosterNames: string[]
  hintedNames: string[]
}): string {
  const roster =
    input.rosterNames.length > 0
      ? input.rosterNames.join('\n')
      : BeatCastExtractPromptLabel.None
  const hinted =
    input.hintedNames.length > 0
      ? input.hintedNames.join('\n')
      : BeatCastExtractPromptLabel.None
  return [
    BeatCastExtractPromptLabel.Roster,
    roster,
    '',
    BeatCastExtractPromptLabel.Hinted,
    hinted,
    '',
    BeatCastExtractPromptLabel.Beat,
    input.beatText,
  ].join('\n')
}

function isFuzzyNameMatch(needle: string, rosterName: string): boolean {
  if (needle.length < BeatCastMatchLimit.FuzzyNameChars) return false
  return rosterName.includes(needle) || needle.includes(rosterName)
}

export function findRosterMember(
  raw: string,
  roster: readonly BeatCastMember[],
): BeatCastMember | undefined {
  const needle = normalizeCastName(raw)
  if (needle.length === 0) return undefined
  const exact = roster.find(member => normalizeCastName(member.name) === needle)
  if (exact) return exact
  return roster.find(member => isFuzzyNameMatch(needle, normalizeCastName(member.name)))
}

export function matchCastByExtractedNames(
  extracted: readonly string[],
  roster: readonly BeatCastMember[],
): BeatCastMember[] {
  const matched: BeatCastMember[] = []
  const seen = new Set<string>()
  for (const raw of extracted) {
    const hit = findRosterMember(raw, roster)
    if (!hit || seen.has(hit.id)) continue
    seen.add(hit.id)
    matched.push(hit)
  }
  return matched
}
