import { describe, expect, it } from 'vitest'
import { hashPromptBody, PROMPT_REGISTRY } from '../prompt-registry'
import { StorytellerPromptRegistryId } from '../prompt-registry-ids'
import { lookupPromptBody } from '../prompt-registry-table'

const REGISTRY_IDS = Object.values(StorytellerPromptRegistryId)

describe('prompt registry', () => {
  it('gives every registry id a non-empty body and a matching hash', () => {
    expect(REGISTRY_IDS.length).toBeGreaterThan(0)
    for (const id of REGISTRY_IDS) {
      const body = lookupPromptBody(id)
      expect(body.length).toBeGreaterThan(0)
      const entry = PROMPT_REGISTRY[id]
      expect(entry).toBeDefined()
      if (entry === undefined) continue
      expect(entry.body).toBe(body)
      expect(entry.hash).toBe(hashPromptBody(body))
    }
  })

  it('changes only the mutated body hash when one prompt changes', () => {
    const first = REGISTRY_IDS[0]
    expect(first).toBeDefined()
    if (first === undefined) return

    const baseline = new Map(
      REGISTRY_IDS.map(id => [id, hashPromptBody(lookupPromptBody(id))] as const)
    )
    const mutatedHash = hashPromptBody(`${lookupPromptBody(first)}!`)
    expect(mutatedHash).not.toBe(baseline.get(first))

    for (const id of REGISTRY_IDS) {
      if (id === first) continue
      expect(hashPromptBody(lookupPromptBody(id))).toBe(baseline.get(id))
    }
  })
})
