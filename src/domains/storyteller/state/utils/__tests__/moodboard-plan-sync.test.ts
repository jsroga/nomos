import { describe, expect, it } from 'vitest'
import {
  applyMoodboardImagesToPlan,
  resolvePrimaryMoodboardUrl,
} from '@/domains/storyteller/state/utils/moodboard-plan-sync'
import { UrlScheme } from '@/shared/data/constants/protocol'

const PROJECT_ID = 'proj-1'
const LOCAL_FILE = 'mood-0.png'
const CDN_URL = `${UrlScheme.Https}://cdn.example/mood.png`

describe('applyMoodboardImagesToPlan', () => {
  it('returns the same plan when the image list is unchanged', () => {
    const prev = { title: 'Stay', moodImages: [CDN_URL] }
    expect(applyMoodboardImagesToPlan(prev, [CDN_URL])).toBe(prev)
  })

  it('returns the same plan when a slot write is a no-op', () => {
    const prev = { title: 'Stay', moodImages: [CDN_URL, LOCAL_FILE] }
    expect(applyMoodboardImagesToPlan(prev, [CDN_URL], 0)).toBe(prev)
  })

  it('replaces a slot without dropping the rest of the list', () => {
    const prev = { title: 'Stay', moodImages: [CDN_URL, LOCAL_FILE] }
    expect(applyMoodboardImagesToPlan(prev, ['next.png'], 1)).toEqual({
      title: 'Stay',
      moodImages: [CDN_URL, 'next.png'],
    })
  })
})

describe('resolvePrimaryMoodboardUrl', () => {
  it('returns null when no primary index is saved', () => {
    expect(resolvePrimaryMoodboardUrl(PROJECT_ID, [LOCAL_FILE], null)).toBeNull()
  })

  it('keeps absolute URLs and prefixes local filenames', () => {
    expect(resolvePrimaryMoodboardUrl(PROJECT_ID, [CDN_URL], '0')).toBe(CDN_URL)
    expect(resolvePrimaryMoodboardUrl(PROJECT_ID, [LOCAL_FILE], '0')).toBe(
      `/projects/${PROJECT_ID}/${LOCAL_FILE}`,
    )
  })
})
