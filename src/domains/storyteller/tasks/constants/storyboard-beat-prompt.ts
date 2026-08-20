import { StorytellerAnswerSeparator } from '@/domains/storyteller/core/storyteller-page-wire'
import type { BeatCastMember } from '@/domains/storyteller/services/constants/beat-cast-extract'

export enum StoryboardBeatStyleCopy {
  Lock = 'Rough white-and-dark storyboard sketch, high contrast, cinematic framing, rough lines. Create a single best frame for this action.',
  Mono = 'Stay black and white storyboard; no color, no photorealism.',
  LikenessIntro = 'Reference images are attached in this order and identify these characters:',
  LikenessRule = 'Draw those characters as the same people as in the references: face shape, hair, body type, and silhouette must match. Translate the portraits into this rough black-and-white storyboard sketch language — do not copy color, lighting, or photographic texture, and do not paste or crop the portraits into the frame.',
  UnreferencedIntro = 'Also in this scene, with no likeness reference:',
  UnreferencedRule = 'Invent a consistent sketch likeness for them.',
}

export enum StoryboardBeatRefLimit {
  MaxPortraits = 4,
}

export interface StoryboardBeatLikeness {
  referencedNames: readonly string[]
  unreferencedNames: readonly string[]
}

export interface StoryboardPortraitRef {
  name: string
  url: string
}

export interface StoryboardCastRefs {
  referenced: StoryboardPortraitRef[]
  unreferencedNames: string[]
}

export function partitionBeatCastRefs(
  members: readonly BeatCastMember[],
  urlsById: Readonly<Record<string, string>>,
  maxRefs: number = StoryboardBeatRefLimit.MaxPortraits,
): StoryboardCastRefs {
  const referenced: StoryboardPortraitRef[] = []
  const unreferencedNames: string[] = []
  for (const member of members) {
    const url = urlsById[member.id]
    if (url && referenced.length < maxRefs) {
      referenced.push({ name: member.name, url })
    } else {
      unreferencedNames.push(member.name)
    }
  }
  return { referenced, unreferencedNames }
}

function numberedNames(names: readonly string[]): string {
  return names
    .map((name, index) => `${index + 1}. ${name}`)
    .join(StorytellerAnswerSeparator.CommaSpace)
}

export function buildStoryboardBeatPrompt(
  scenePrompt: string,
  likeness?: StoryboardBeatLikeness,
): string {
  const parts = [
    `${scenePrompt.trim()}. ${StoryboardBeatStyleCopy.Lock} ${StoryboardBeatStyleCopy.Mono}`,
  ]
  const referencedNames = likeness?.referencedNames ?? []
  const unreferencedNames = likeness?.unreferencedNames ?? []
  if (referencedNames.length > 0) {
    parts.push(
      `${StoryboardBeatStyleCopy.LikenessIntro} ${numberedNames(referencedNames)}. ${StoryboardBeatStyleCopy.LikenessRule}`,
    )
  }
  if (unreferencedNames.length > 0) {
    parts.push(
      `${StoryboardBeatStyleCopy.UnreferencedIntro} ${unreferencedNames.join(StorytellerAnswerSeparator.CommaSpace)}. ${StoryboardBeatStyleCopy.UnreferencedRule}`,
    )
  }
  return parts.join(' ')
}
