/**
 * The registry's guarantee is a compile error, not this test — `Record<
 * WorldBibleSection, SectionSpec>` rejects a missing section. These cover what
 * the type cannot: a section declared but declared wrongly.
 */
import { describe, expect, it } from 'vitest'
import { BibleSection } from '@/domains/storyteller/core/types/enums'
import {
  SECTION_REGISTRY,
  WORLD_BIBLE_SECTIONS,
} from '@/domains/storyteller/core/bible/section-registry'

describe('SECTION_REGISTRY', () => {
  it('declares every world section exactly once', () => {
    expect(Object.keys(SECTION_REGISTRY).sort()).toEqual([...WORLD_BIBLE_SECTIONS].sort())
  })

  it('excludes the two sections that are not world content', () => {
    expect(WORLD_BIBLE_SECTIONS).not.toContain(BibleSection.EPISODE_PREMISE)
    expect(WORLD_BIBLE_SECTIONS).not.toContain(BibleSection.FULL)
  })

  it('makes every non-hydrating section say why', () => {
    const silent = Object.entries(SECTION_REGISTRY)
      .filter(([, spec]) => !spec.hydrates && !spec.why?.trim())
      .map(([section]) => section)

    expect(silent).toEqual([])
  })

  it('never declares an alias that is itself a section key', () => {
    const keys = new Set<string>(Object.keys(SECTION_REGISTRY))
    const collisions = Object.entries(SECTION_REGISTRY).flatMap(([section, spec]) =>
      (spec.aliases ?? []).filter(alias => keys.has(alias)).map(alias => `${section} → ${alias}`)
    )

    expect(collisions).toEqual([])
  })

  it('gives every section a non-empty label', () => {
    const unlabelled = Object.entries(SECTION_REGISTRY)
      .filter(([, spec]) => !spec.label.trim())
      .map(([section]) => section)

    expect(unlabelled).toEqual([])
  })
})
