import { UrlScheme } from '@/shared/data/constants/protocol'

export function isMoodboardStyleRefUrl(url: string): boolean {
  return url.startsWith(`${UrlScheme.Https}://`)
}

export function firstMoodboardStyleRefUrl(urls: readonly string[]): string | undefined {
  return urls.find(isMoodboardStyleRefUrl)
}

export function moodboardStyleReferenceForPrompt(input: {
  replaceIndex: number | undefined
  promptOffset: number
  keyImageUrl: string | undefined
}): string | undefined {
  const keyImageUrl = input.keyImageUrl
  if (!keyImageUrl || !isMoodboardStyleRefUrl(keyImageUrl)) return undefined
  if (input.replaceIndex === 0) return undefined
  if (typeof input.replaceIndex === 'number') return keyImageUrl
  if (input.promptOffset > 0) return keyImageUrl
  return undefined
}
