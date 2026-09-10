import { MidjourneyParamFlag } from '@/shared/data/server/midjourney-params'

export enum StorytellerLookSrefUrl {
  One = 'https://cdn.midjourney.com/82859a17-efca-4d33-8670-61760a185164/0_3.png',
  Two = 'https://cdn.midjourney.com/0af04658-ab27-4a66-8c6c-17031023ff7e/0_1.png',
}

/** Midjourney --sref look key for moodboard, poster, and portrait. Not used by storyboard. Reorder or drop entries to experiment. */
export const STORYTELLER_LOOK_SREF_URLS: readonly string[] = [
  StorytellerLookSrefUrl.One,
  StorytellerLookSrefUrl.Two,
]

function uniqueHttpUrls(urls: readonly string[]): string[] {
  const seen = new Set<string>()
  const unique: string[] = []
  for (const url of urls) {
    if (!url || seen.has(url)) continue
    seen.add(url)
    unique.push(url)
  }
  return unique
}

export function storytellerLookSrefUrls(extraUrls: readonly string[] = []): string[] {
  return uniqueHttpUrls([...STORYTELLER_LOOK_SREF_URLS, ...extraUrls])
}

export function appendStorytellerLookSref(
  prompt: string,
  extraUrls: readonly string[] = [],
): string {
  const urls = storytellerLookSrefUrls(extraUrls)
  if (urls.length === 0) return prompt
  return `${prompt} ${MidjourneyParamFlag.StyleRef} ${urls.join(' ')}`
}
