import { StorytellerQueryParam } from '@/domains/storyteller/core/storyteller-page-wire'

export function storytellerSearchParams(
  source: string | URLSearchParams | null | undefined
): URLSearchParams {
  const next = new URLSearchParams(source?.toString() ?? '')
  next.delete(StorytellerQueryParam.Bible)
  next.delete(StorytellerQueryParam.BibleTab)
  return next
}
