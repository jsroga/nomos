import {
  buildLockedVisualPrompt,
  lockedVisualBase,
} from './locked-visual-prompt'

export enum CharacterPortraitBasePhrase {
  To = 'character portrait',
}

export const CharacterPortraitPromptLock = {
  Prefix: '!character portrait!',
  Base: lockedVisualBase(CharacterPortraitBasePhrase.To),
} as const

export function buildCharacterPortraitPrompt(scene: string): string | null {
  return buildLockedVisualPrompt(
    CharacterPortraitPromptLock.Prefix,
    scene,
    CharacterPortraitBasePhrase.To,
  )
}
