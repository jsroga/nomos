import { describe, expect, it } from 'vitest'
import { StoryEntityType } from '@/domains/storyteller/core/entities/constants/entity-types'
import {
  EntityRefPrefix,
  ReferenceSegmentType,
} from '@/domains/storyteller/core/entities/constants/reference-parser'
import {
  createRefId,
  hasReferences,
  parseReferences,
  splitIntoSegments,
  stripReferences,
} from '@/domains/storyteller/core/entities/reference-parser'

describe('parseReferences', () => {
  it('returns no chips for empty text', () => {
    // Arrange
    const text = ''

    // Act
    const refs = parseReferences(text)

    // Assert
    expect(refs).toEqual([])
  })

  it('ignores markdown link syntax that is not an entity chip', () => {
    // Arrange
    const text = '[Marcus](https://example.com) is not a chip'

    // Act
    const refs = parseReferences(text)

    // Assert
    expect(refs).toEqual([])
  })

  it('rejects a chip whose id contains whitespace', () => {
    // Arrange
    const text = '[Marcus][char marcus]'

    // Act
    const refs = parseReferences(text)

    // Assert
    expect(refs).toEqual([])
  })

  it('parses an item chip with an unknown-looking but legal id', () => {
    // Arrange
    const text = 'Take the [Ledger Key][item-a1b2c3d4].'

    // Act
    const refs = parseReferences(text)

    // Assert
    expect(refs).toHaveLength(1)
    expect(refs[0]?.type).toBe(StoryEntityType.Item)
    expect(refs[0]?.refId).toBe('item-a1b2c3d4')
  })

  it('marks an unrecognized prefix as a chip with null type', () => {
    // Arrange
    const text = '[Thing][xyz-not-a-type]'

    // Act
    const refs = parseReferences(text)

    // Assert
    expect(refs).toHaveLength(1)
    expect(refs[0]?.type).toBeNull()
    expect(refs[0]?.refId).toBe('xyz-not-a-type')
  })
})

describe('splitIntoSegments', () => {
  it('keeps a single text segment when there are no chips', () => {
    // Arrange
    const text = 'No chips here.'

    // Act
    const segments = splitIntoSegments(text)

    // Assert
    expect(segments).toEqual([{ type: ReferenceSegmentType.Text, content: text }])
  })

  it('splits adjacent chips without dropping the text between them', () => {
    // Arrange
    const text = '[Marcus][char-marcus] vs [Sera][char-sera] in the ward.'

    // Act
    const segments = splitIntoSegments(text)

    // Assert
    let refCount = 0
    let hasVs = false
    let hasWard = false
    for (const segment of segments) {
      if (segment.type === ReferenceSegmentType.Reference) {
        refCount += 1
        continue
      }
      if (segment.content.includes('vs')) hasVs = true
      if (segment.content.includes('ward')) hasWard = true
    }
    expect(refCount).toBe(2)
    expect(hasVs).toBe(true)
    expect(hasWard).toBe(true)
  })

  it('does not drop a trailing sentence after the last chip', () => {
    // Arrange
    const text = 'See [Marcus][char-marcus]. Then leave.'

    // Act
    const segments = splitIntoSegments(text)

    // Assert
    const last = segments[segments.length - 1]
    expect(last).toEqual({ type: ReferenceSegmentType.Text, content: '. Then leave.' })
  })
})

describe('hasReferences / stripReferences / createRefId', () => {
  it('does not treat bold markdown as a reference', () => {
    // Arrange
    const text = '**The Ward** keeps the ledger.'

    // Act
    const found = hasReferences(text)

    // Assert
    expect(found).toBe(false)
  })

  it('strips chips down to display names when context must be plain text', () => {
    // Arrange
    const text = '[Marcus][char-marcus] finds [the Ward][place-the-ward].'

    // Act
    const stripped = stripReferences(text)

    // Assert
    expect(stripped).toBe('Marcus finds the Ward.')
    expect(stripped).not.toContain('char-')
  })

  it('builds an episode prefix that parseReferences can round-trip', () => {
    // Arrange
    const refId = createRefId(StoryEntityType.Episode, 'pilot')

    // Act
    const refs = parseReferences(`Watch [Pilot][${refId}]`)

    // Assert
    expect(refId.startsWith(`${EntityRefPrefix.Episode}-`)).toBe(true)
    expect(refs[0]?.type).toBe(StoryEntityType.Episode)
  })
})
