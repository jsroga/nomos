import { describe, expect, it } from 'vitest'
import {
  decideMasterPromptHydrate,
  MasterPromptHydrateAction,
} from '../decide-master-prompt-hydrate'

const BASE = {
  hydrateKey: 'proj-1',
  lastHydrateKey: 'proj-1',
  serverPrompt: 'saved',
  localPrompt: 'saved',
  dirty: false,
  lastSent: 'saved',
}

describe('decideMasterPromptHydrate', () => {
  it('applies server text when the project or episode identity changes', () => {
    expect(
      decideMasterPromptHydrate({
        ...BASE,
        lastHydrateKey: 'proj-old',
        serverPrompt: 'from next project',
        localPrompt: 'draft on old',
        dirty: true,
      }),
    ).toBe(MasterPromptHydrateAction.ApplyServer)
  })

  it('applies server text on first hydrate', () => {
    expect(
      decideMasterPromptHydrate({
        ...BASE,
        lastHydrateKey: null,
        serverPrompt: 'from db',
        localPrompt: '',
      }),
    ).toBe(MasterPromptHydrateAction.ApplyServer)
  })

  it('clears dirty when server has caught up to the input', () => {
    expect(
      decideMasterPromptHydrate({
        ...BASE,
        dirty: true,
        serverPrompt: 'hello world',
        localPrompt: 'hello world',
        lastSent: 'hello world',
      }),
    ).toBe(MasterPromptHydrateAction.Synced)
  })

  it('keeps the input when an in-flight save echoes an older snapshot', () => {
    expect(
      decideMasterPromptHydrate({
        ...BASE,
        dirty: true,
        serverPrompt: 'hello',
        localPrompt: 'hello world',
        lastSent: 'hello world',
      }),
    ).toBe(MasterPromptHydrateAction.KeepLocal)
  })

  it('writes the input to the server when a stale echo arrives before the latest debounce', () => {
    expect(
      decideMasterPromptHydrate({
        ...BASE,
        dirty: true,
        serverPrompt: 'hel',
        localPrompt: 'hello world',
        lastSent: 'hel',
      }),
    ).toBe(MasterPromptHydrateAction.PersistLocal)
  })

  it('applies an external server change when the input is not dirty', () => {
    expect(
      decideMasterPromptHydrate({
        ...BASE,
        dirty: false,
        serverPrompt: 'other tab',
        localPrompt: 'saved',
        lastSent: 'saved',
      }),
    ).toBe(MasterPromptHydrateAction.ApplyServer)
  })
})
