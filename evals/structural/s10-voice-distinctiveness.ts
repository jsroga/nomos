import { extractNovelDialogue } from '@/domains/storyteller/core/voice/extract-novel-dialogue'
import { extractScriptDialogue } from '@/domains/storyteller/core/voice/extract-script-dialogue'
import { tokenize } from './beat-text'
import { DISTINCT_N_VALUES, ScorerId } from './constants'
import type { DumpedBeat, StructuralScore } from './types'

export interface VoiceFingerprintCard {
  name: string
  favouredLexicon: string[]
  forbiddenLexicon: string[]
}

const FUNCTION_WORDS = [
  'the',
  'a',
  'an',
  'and',
  'or',
  'but',
  'if',
  'of',
  'to',
  'in',
  'on',
  'at',
  'by',
  'for',
  'with',
  'from',
  'as',
  'is',
  'was',
  'were',
  'be',
  'been',
  'are',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'would',
  'could',
  'should',
  'might',
  'must',
  'will',
  'can',
  'not',
  'no',
  'i',
  'you',
  'he',
  'she',
  'we',
  'they',
  'it',
  'my',
  'your',
  'his',
  'her',
  'our',
  'their',
  'this',
  'that',
  'these',
  'those',
  'what',
  'which',
  'who',
  'when',
  'where',
  'how',
  'so',
  'then',
  'than',
  'too',
  'very',
  'just',
  'even',
  'only',
  'also',
  'still',
  'yet',
  'because',
  'while',
  'though',
  'into',
  'about',
  'over',
  'after',
  'before',
  'up',
  'out',
  'off',
  'down',
  'there',
  'here',
  'now',
]

const FUNCTION_WORD_SET = new Set<string>(FUNCTION_WORDS)
const NGRAM_SIZE = DISTINCT_N_VALUES[0]
const MIN_SPEAKERS = 2

export enum VoiceDistinctivenessFloor {
  MinToken = 4,
}

interface SpeakerProfile {
  name: string
  tokens: string[]
  functionShares: number[]
  trigrams: string[]
}

function manuscriptFromBeats(beats: readonly DumpedBeat[]): string {
  return beats.map(beat => beat.content).join('\n\n')
}

function attributedLines(manuscript: string): Array<{ speaker: string; text: string }> {
  const script = extractScriptDialogue(manuscript)
    .filter(line => line.speaker !== null)
    .map(line => ({ speaker: line.speaker ?? '', text: line.text }))
  const attributed = script.filter(line => line.speaker.length > 0)
  if (attributed.length >= MIN_SPEAKERS) return attributed
  return extractNovelDialogue(manuscript)
    .filter(line => line.speaker !== null)
    .map(line => ({ speaker: line.speaker ?? '', text: line.text }))
    .filter(line => line.speaker.length > 0)
}

function linesBySpeaker(lines: ReadonlyArray<{ speaker: string; text: string }>): Map<string, string[]> {
  const grouped = new Map<string, string[]>()
  for (const line of lines) {
    const existing = grouped.get(line.speaker) ?? []
    existing.push(line.text)
    grouped.set(line.speaker, existing)
  }
  return grouped
}

function ngrams(tokens: string[], size: number): string[] {
  if (tokens.length < size) return []
  const grams: string[] = []
  for (let index = 0; index <= tokens.length - size; index += 1) {
    grams.push(tokens.slice(index, index + size).join(' '))
  }
  return grams
}

function functionShares(tokens: string[]): number[] {
  const counts = new Array<number>(FUNCTION_WORDS.length).fill(0)
  let total = 0
  for (const token of tokens) {
    if (!FUNCTION_WORD_SET.has(token)) continue
    const index = FUNCTION_WORDS.indexOf(token)
    if (index < 0) continue
    counts[index] += 1
    total += 1
  }
  if (total === 0) return counts
  return counts.map(count => count / total)
}

function l1Half(left: number[], right: number[]): number {
  let sum = 0
  const length = Math.min(left.length, right.length)
  for (let index = 0; index < length; index += 1) {
    sum += Math.abs((left[index] ?? 0) - (right[index] ?? 0))
  }
  return sum / 2
}

function jaccardDivergence(left: string[], right: string[]): number {
  if (left.length === 0 && right.length === 0) return 0
  const setA = new Set(left)
  const setB = new Set(right)
  let intersection = 0
  for (const gram of setA) {
    if (setB.has(gram)) intersection += 1
  }
  const union = new Set([...setA, ...setB]).size
  if (union === 0) return 0
  return 1 - intersection / union
}

function pairDivergence(left: SpeakerProfile, right: SpeakerProfile): number {
  const functionDiv = l1Half(left.functionShares, right.functionShares)
  const gramDiv = jaccardDivergence(left.trigrams, right.trigrams)
  if (left.trigrams.length === 0 && right.trigrams.length === 0) return functionDiv
  return (functionDiv + gramDiv) / 2
}

function profilesFromBeats(beats: readonly DumpedBeat[]): SpeakerProfile[] {
  const grouped = linesBySpeaker(attributedLines(manuscriptFromBeats(beats)))
  const profiles: SpeakerProfile[] = []
  for (const [name, texts] of grouped) {
    const tokens = tokenize(texts.join(' '))
    if (tokens.length < VoiceDistinctivenessFloor.MinToken) continue
    profiles.push({
      name,
      tokens,
      functionShares: functionShares(tokens),
      trigrams: ngrams(tokens, NGRAM_SIZE),
    })
  }
  return profiles
}

function minPairwise(profiles: readonly SpeakerProfile[]): number {
  if (profiles.length < MIN_SPEAKERS) return 0
  let min = 1
  for (let i = 0; i < profiles.length; i += 1) {
    const left = profiles[i]
    if (!left) continue
    for (let j = i + 1; j < profiles.length; j += 1) {
      const right = profiles[j]
      if (!right) continue
      const divergence = pairDivergence(left, right)
      if (divergence < min) min = divergence
    }
  }
  return min
}

function lexiconHitRate(text: string, terms: readonly string[]): number {
  if (terms.length === 0) return 1
  const lower = text.toLowerCase()
  let hits = 0
  for (const term of terms) {
    if (term.length > 0 && lower.includes(term.toLowerCase())) hits += 1
  }
  return hits / terms.length
}

function forbiddenRate(text: string, terms: readonly string[]): number {
  if (terms.length === 0) return 0
  return lexiconHitRate(text, terms)
}

function fingerprintAdherence(
  profiles: readonly SpeakerProfile[],
  cards: readonly VoiceFingerprintCard[]
): number | null {
  if (cards.length === 0) return null
  const byName = new Map(profiles.map(profile => [profile.name.toLowerCase(), profile]))
  const scores: number[] = []
  for (const card of cards) {
    const profile = byName.get(card.name.toLowerCase())
    if (!profile) continue
    const text = profile.tokens.join(' ')
    const favoured = lexiconHitRate(text, card.favouredLexicon)
    scores.push((favoured + (1 - forbiddenRate(text, card.forbiddenLexicon))) / 2)
  }
  if (scores.length === 0) return null
  return scores.reduce((sum, value) => sum + value, 0) / scores.length
}

export function scoreVoiceDistinctiveness(
  beats: readonly DumpedBeat[],
  fingerprints: readonly VoiceFingerprintCard[] = []
): StructuralScore {
  const profiles = profilesFromBeats(beats)
  return {
    id: ScorerId.VoiceDistinctiveness,
    metrics: {
      minPairwiseDivergence: minPairwise(profiles),
      speakerCount: profiles.length,
      fingerprintAdherence: fingerprintAdherence(profiles, fingerprints),
    },
    flags: [],
  }
}
