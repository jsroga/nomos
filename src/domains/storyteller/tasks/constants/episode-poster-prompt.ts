import {
  buildLockedVisualPrompt,
  lockedVisualBase,
} from './locked-visual-prompt'

export enum EpisodePosterBasePhrase {
  To = 'movie poster',
}

export const EpisodePosterPromptLock = {
  Prefix: '!movie poster!',
  Base: lockedVisualBase(EpisodePosterBasePhrase.To),
} as const

export function buildEpisodePosterPrompt(scene: string): string | null {
  return buildLockedVisualPrompt(
    EpisodePosterPromptLock.Prefix,
    scene,
    EpisodePosterBasePhrase.To,
  )
}
