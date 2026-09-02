/**
 * The registry's guarantee is a compile error, not this test — `Record<
 * WorldBibleSection, SectionSpec>` rejects a missing section. These cover what
 * the type cannot: a section declared but declared wrongly.
 */
import { describe, expect, it } from 'vitest'
import { BibleSection } from '@/domains/storyteller/core/types/enums'
import { STORY_PLAN_MERGE_FIELDS } from '@/domains/storyteller/config/constants/bible-wire-fields'
import {
  SECTION_REGISTRY,
  WORLD_BIBLE_SECTIONS,
  WORLD_SCALAR_FIELDS,
  bibleOwnedPlanFields,
  mergeStrategyFor,
} from '@/domains/storyteller/core/bible/section-registry'

/** Belongs to one episode, so it is neither a world section nor a world scalar. */
const EPISODE_OWNED_PLAN_FIELDS = ['storyboardUrl', 'storyboardPrompt']

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
      Object.keys(spec.aliases ?? {})
        .filter(alias => keys.has(alias))
        .map(alias => `${section} → ${alias}`)
    )

    expect(collisions).toEqual([])
  })

  it('puts every bible-owned section into the derived ownership list', () => {
    const owned = new Set(bibleOwnedPlanFields())
    const missing = WORLD_BIBLE_SECTIONS.filter(section => !owned.has(section))

    expect(missing).toEqual([])
  })

  it('declares a merge strategy for every section and none for a scalar', () => {
    expect(WORLD_BIBLE_SECTIONS.every(section => mergeStrategyFor(section))).toBe(true)
    expect(mergeStrategyFor('genre')).toBeUndefined()
  })

  /**
   * Closes the gap the registry cannot: eight world-level fields are story-plan
   * scalars rather than `BibleSection` members, so the `Record` type does not
   * force them to be declared. Adding a field to the wire list without saying
   * which of the three kinds it is used to be exactly how a section went
   * missing — now it fails here instead.
   */
  it('classifies every wire plan field as a section, a world scalar, or episode-owned', () => {
    const sections = new Set<string>(WORLD_BIBLE_SECTIONS)
    const scalars = new Set(Object.keys(WORLD_SCALAR_FIELDS))
    const episodeOwned = new Set(EPISODE_OWNED_PLAN_FIELDS)

    const unclassified = STORY_PLAN_MERGE_FIELDS.filter(
      field => !sections.has(field) && !scalars.has(field) && !episodeOwned.has(field)
    )

    expect(unclassified).toEqual([])
  })

  it('gives every section a non-empty label', () => {
    const unlabelled = Object.entries(SECTION_REGISTRY)
      .filter(([, spec]) => !spec.label.trim())
      .map(([section]) => section)

    expect(unlabelled).toEqual([])
  })
})
