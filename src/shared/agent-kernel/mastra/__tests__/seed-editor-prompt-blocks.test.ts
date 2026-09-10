import { describe, expect, it } from 'vitest'
import { MastraAgentVersionStatus } from '../constants/editor'
import {
  EditorPromptBlockKind,
  publishCatalogDescription,
  upsertPromptCatalogBlock,
  type PromptCatalogRow,
  type PromptCatalogStore,
} from '../seed-editor-prompt-blocks'

const BLOCK_ID = 'registry-magic-judge'
const CATALOG_DESCRIPTION = 'Eval · Holistic creative quality 0–100.'
const V1 = 'version-empty'
const V2 = 'version-with-description'

function row(partial: Partial<PromptCatalogRow> & Pick<PromptCatalogRow, 'id'>): PromptCatalogRow {
  return {
    status: MastraAgentVersionStatus.Draft,
    ...partial,
  }
}

function createStore(state: {
  draft: PromptCatalogRow | null
  published: PromptCatalogRow | null
}): PromptCatalogStore & { updates: Record<string, unknown>[] } {
  const updates: Record<string, unknown>[] = []
  return {
    updates,
    async getById(id, options) {
      if (id !== BLOCK_ID) return null
      if (options?.status === MastraAgentVersionStatus.Published) return state.published
      return state.draft
    },
    async create() {
      return undefined
    },
    async update(input) {
      updates.push(input)
      if (input.activeVersionId) {
        const next = row({
          id: input.id,
          status: MastraAgentVersionStatus.Published,
          description: CATALOG_DESCRIPTION,
          activeVersionId: input.activeVersionId,
          resolvedVersionId: input.activeVersionId,
        })
        state.published = next
        state.draft = { ...state.draft, ...next, id: input.id }
      }
      if (input.description) {
        const nextId = V2
        state.draft = row({
          id: input.id,
          description: input.description,
          resolvedVersionId: nextId,
          activeVersionId: state.published?.activeVersionId,
          status: state.published?.status ?? MastraAgentVersionStatus.Draft,
        })
      }
    },
  }
}

describe('Studio prompt catalog Description publish', () => {
  it('activates the latest catalog Description when Publish already points at an empty snapshot', async () => {
    const store = createStore({
      draft: row({
        id: BLOCK_ID,
        status: MastraAgentVersionStatus.Published,
        description: CATALOG_DESCRIPTION,
        activeVersionId: V1,
        resolvedVersionId: V2,
      }),
      published: row({
        id: BLOCK_ID,
        status: MastraAgentVersionStatus.Published,
        activeVersionId: V1,
        resolvedVersionId: V1,
      }),
    })

    const activated = await publishCatalogDescription(store, BLOCK_ID, CATALOG_DESCRIPTION)
    expect(activated).toBe(true)
    expect(store.updates).toEqual([
      {
        id: BLOCK_ID,
        status: MastraAgentVersionStatus.Published,
        activeVersionId: V2,
      },
    ])
  })

  it('does not Publish a newer draft when the active snapshot already has catalog Description', async () => {
    const store = createStore({
      draft: row({
        id: BLOCK_ID,
        status: MastraAgentVersionStatus.Published,
        description: CATALOG_DESCRIPTION,
        activeVersionId: V1,
        resolvedVersionId: V2,
      }),
      published: row({
        id: BLOCK_ID,
        status: MastraAgentVersionStatus.Published,
        description: CATALOG_DESCRIPTION,
        activeVersionId: V1,
        resolvedVersionId: V1,
      }),
    })

    const activated = await publishCatalogDescription(store, BLOCK_ID, CATALOG_DESCRIPTION)
    expect(activated).toBe(false)
    expect(store.updates).toEqual([])
  })

  it('writes Description then activates it when the draft snapshot is still empty', async () => {
    const store = createStore({
      draft: row({
        id: BLOCK_ID,
        status: MastraAgentVersionStatus.Published,
        activeVersionId: V1,
        resolvedVersionId: V1,
      }),
      published: row({
        id: BLOCK_ID,
        status: MastraAgentVersionStatus.Published,
        activeVersionId: V1,
        resolvedVersionId: V1,
      }),
    })

    const activated = await upsertPromptCatalogBlock(store, {
      id: BLOCK_ID,
      name: 'magic-judge',
      content: 'judge body',
      description: CATALOG_DESCRIPTION,
      kind: EditorPromptBlockKind.CorePrompt,
    })
    expect(activated).toBe(true)
    expect(store.updates[0]).toEqual({ id: BLOCK_ID, description: CATALOG_DESCRIPTION })
    expect(store.updates[1]).toEqual({
      id: BLOCK_ID,
      status: MastraAgentVersionStatus.Published,
      activeVersionId: V2,
    })
  })
})
