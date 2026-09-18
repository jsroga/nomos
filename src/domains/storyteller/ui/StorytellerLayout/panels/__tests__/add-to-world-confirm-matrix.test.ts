import { describe, expect, it } from 'vitest'
import { BibleSection } from '@/domains/storyteller/core/types/enums'
import { shouldConfirmAddToWorldOverwrite } from '../add-to-world-confirm'

const SECTIONS = Object.values(BibleSection)

describe('shouldConfirmAddToWorldOverwrite', () => {
  it.each(SECTIONS)('skips confirm for a single expected section %s', section => {
    expect(
      shouldConfirmAddToWorldOverwrite({
        targetSections: [section],
        requestedSection: section,
      }),
    ).toBe(false)
  })

  it.each(SECTIONS)('skips confirm for a single unexpected section %s', section => {
    expect(
      shouldConfirmAddToWorldOverwrite({
        targetSections: [section],
        requestedSection: undefined,
      }),
    ).toBe(false)
  })

  it.each(
    SECTIONS.flatMap(requested =>
      SECTIONS.filter(extra => extra !== requested).map(extra => ({ requested, extra })),
    ),
  )(
    'confirms when $requested is expected and $extra is extra',
    ({ requested, extra }) => {
      expect(
        shouldConfirmAddToWorldOverwrite({
          targetSections: [requested, extra],
          requestedSection: requested,
        }),
      ).toBe(true)
    },
  )

  it.each(
    SECTIONS.flatMap((first, index) =>
      SECTIONS.slice(index + 1).map(second => [first, second] as const),
    ),
  )('confirms two sections %s + %s when nothing was requested', (first, second) => {
    expect(
      shouldConfirmAddToWorldOverwrite({
        targetSections: [first, second],
        requestedSection: undefined,
      }),
    ).toBe(true)
  })

  it('skips confirm for soundtrack-only from the soundtrack control', () => {
    expect(
      shouldConfirmAddToWorldOverwrite({
        targetSections: [BibleSection.SOUNDTRACKS],
        requestedSection: BibleSection.SOUNDTRACKS,
      }),
    ).toBe(false)
  })
})
