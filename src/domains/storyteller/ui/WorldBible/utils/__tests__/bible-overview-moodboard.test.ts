import { describe, expect, it } from 'vitest'
import {
  collectMoodboardImages,
  moodboardImageClickHandler,
  parseMoodboardGeneratingIndices,
  uniqueMoodImageUrls,
  moodboardImageAlt,
  isMoodboardGenerateBlocked,
} from '../bible-overview-moodboard'
import { isOverviewReadyForMoodboard } from '../bible-overview-fields'
import { BibleOverviewMoodboardCopy } from '../../constants/bible-overview'
import { moodboardGenOperationPrefix } from '@/domains/storyteller/services/constants/moodboard-generation-service'
import { AsyncOperationStatus } from '@/shared/jobs/constants/async-operation-status'
import type { AsyncOperation } from '@/shared/jobs/useGlobalStatusStore'

const PROJECT_ID = 'proj-1'

function op(id: string): AsyncOperation {
  return {
    id,
    type: 'story-agent',
    label: 'Generating Moodboard',
    status: AsyncOperationStatus.InProgress,
  }
}

describe('parseMoodboardGeneratingIndices', () => {
  it('marks three slots for a full-board generate', () => {
    const indices = parseMoodboardGeneratingIndices(
      [op(moodboardGenOperationPrefix(PROJECT_ID))],
      PROJECT_ID,
    )
    expect([...indices].sort((a, b) => a - b)).toEqual([0, 1, 2])
  })

  it('marks a single regen index', () => {
    const indices = parseMoodboardGeneratingIndices(
      [op(`${moodboardGenOperationPrefix(PROJECT_ID)}-4`)],
      PROJECT_ID,
    )
    expect([...indices]).toEqual([4])
  })
})

describe('isMoodboardGenerateBlocked', () => {
  it('allows other slots while one image is regenerating', () => {
    const generating = new Set([1])
    expect(isMoodboardGenerateBlocked(generating, false, 0)).toBe(false)
    expect(isMoodboardGenerateBlocked(generating, false, 1)).toBe(true)
    expect(isMoodboardGenerateBlocked(generating, false, 2)).toBe(false)
  })

  it('blocks every slot while a full-board generate is running', () => {
    expect(isMoodboardGenerateBlocked(new Set([0, 1, 2]), true, 3)).toBe(true)
  })
})

describe('uniqueMoodImageUrls', () => {
  it('keeps first occurrence and drops empty strings', () => {
    expect(
      uniqueMoodImageUrls([
        'https://cdn.example/a.png',
        'https://cdn.example/b.png',
        'https://cdn.example/c.png',
        'https://cdn.example/a.png',
        'https://cdn.example/b.png',
        'https://cdn.example/c.png',
        '',
        'https://cdn.example/a.png',
      ]),
    ).toEqual([
      'https://cdn.example/a.png',
      'https://cdn.example/b.png',
      'https://cdn.example/c.png',
    ])
  })
})

describe('moodboardImageAlt', () => {
  it('numbers mood images from one', () => {
    expect(moodboardImageAlt(0)).toBe(`${BibleOverviewMoodboardCopy.MoodImageAltPrefix} 1`)
    expect(moodboardImageAlt(2)).toBe(`${BibleOverviewMoodboardCopy.MoodImageAltPrefix} 3`)
  })
})

describe('collectMoodboardImages', () => {
  it('prefers local string urls and drops duplicates', () => {
    expect(
      collectMoodboardImages(
        ['https://cdn.example/a.png', 'https://cdn.example/a.png'],
        ['https://cdn.example/b.png'],
      ),
    ).toEqual(['https://cdn.example/a.png'])
  })

  it('falls back to saved images when local is missing', () => {
    expect(collectMoodboardImages(undefined, ['https://cdn.example/b.png'])).toEqual([
      'https://cdn.example/b.png',
    ])
  })

  it('falls back to saved images when local is empty', () => {
    expect(collectMoodboardImages([], ['https://cdn.example/b.png'])).toEqual([
      'https://cdn.example/b.png',
    ])
  })

  it('prefers saved urls over stale local when requested', () => {
    expect(
      collectMoodboardImages(
        ['https://cdn.example/old.png'],
        ['https://cdn.example/new.png'],
        true,
      ),
    ).toEqual(['https://cdn.example/new.png'])
  })
})

describe('moodboardImageClickHandler', () => {
  it('returns undefined when loading or no expander', () => {
    expect(moodboardImageClickHandler(undefined, false, 0)).toBeUndefined()
    expect(moodboardImageClickHandler(() => undefined, true, 0)).toBeUndefined()
  })
})

describe('isOverviewReadyForMoodboard', () => {
  it('requires a world description', () => {
    expect(isOverviewReadyForMoodboard({ worldDescription: 'A basalt coast' })).toBe(true)
    expect(
      isOverviewReadyForMoodboard({ executiveSummary: 'A keeper holds the last lamp.' }),
    ).toBe(false)
  })
})
