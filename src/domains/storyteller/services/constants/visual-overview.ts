export const VISUAL_SUBJECT_MAX_WORDS = 5

export enum VisualOverviewLabel {
  World = 'World',
  Overview = 'Overview',
  Focus = 'Focus',
  Character = 'Character',
  Episode = 'Episode',
}

export enum VisualSubjectKind {
  Scene = 'scene',
  Portrait = 'portrait',
  Poster = 'poster',
}

export enum VisualSubjectCopy {
  Single =
    'You write a Midjourney subject. Output 3 to 5 words only. No sentences, no quotes, no --params.',
  Portrait =
    'You write a Midjourney subject for a character portrait. Output 3 to 5 words that name the person: look, species, clothing, or role. Do not name a place, landscape, building, or setting. Focus is the character. World and Overview are style context only.',
  Poster =
    'You write a Midjourney subject for a movie poster. Output 3 to 5 words that name the key art: the central figure, conflict, or iconic moment. This is a film poster, not a location plate and not a headshot. Focus is the episode. World and Overview are style context only.',
  Batch =
    'You write Midjourney subjects. Output ONLY a JSON array of strings, no markdown. Each string is 3 to 5 words only. No sentences, no quotes, no --params.',
  SlotRule = 'Name the subject in 3 to 5 words.',
}

export enum VisualSubjectLog {
  ParseFallback = '[visual-subject] Falling back after parse failure',
  OpenAiFailed = '[visual-subject] OpenAI subject generation failed:',
}

const MJ_FLAG_PREFIX = '--'

export function clampVisualSubjectWords(scene: string): string {
  const words = scene.trim().split(/\s+/).filter(word => word.length > 0)
  if (words.length === 0) return ''
  return words.slice(0, VISUAL_SUBJECT_MAX_WORDS).join(' ')
}

export function stripMidjourneyFlags(prompt: string): string {
  const tokens = prompt.trim().split(/\s+/).filter(token => token.length > 0)
  const kept: string[] = []
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]
    if (token.startsWith(MJ_FLAG_PREFIX)) {
      const next = tokens[index + 1]
      if (next && !next.startsWith(MJ_FLAG_PREFIX)) {
        index += 1
      }
      continue
    }
    kept.push(token)
  }
  return kept.join(' ')
}

export function normalizeVisualSubject(prompt: string): string {
  return clampVisualSubjectWords(stripMidjourneyFlags(prompt.replace(/^"|"$/g, '')))
}
