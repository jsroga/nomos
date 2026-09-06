import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SystemScopeReason, systemScope } from '@/shared/auth/project-scope'
import { LlmFeature } from '@/shared/ai/gateway/constants/llm-call'

const { embed, dbExecute } = vi.hoisted(() => ({
  embed: vi.fn(),
  dbExecute: vi.fn(),
}))

vi.mock('@/shared/ai/gateway', () => ({ embed }))
vi.mock('@/db/client', () => ({
  db: { execute: dbExecute },
}))

import { entityGraphService } from '@/domains/storyteller/services/entity-graph-service'

enum EntityGraphSource {
  GraphService = 'src/domains/storyteller/services/entity-graph-service.ts',
  RegistryEmbedding = 'src/domains/storyteller/services/entity-registry-embedding.ts',
  RegistryService = 'src/domains/storyteller/services/entity-registry-service.ts',
}

enum VoyageForbidden {
  GetClient = 'getVoyageEmbeddings',
  EmbedDocuments = 'embedDocuments(',
}

const SCOPE = systemScope('11111111-1111-4111-8111-111111111111', SystemScopeReason.JobContext)

describe('entity-graph embedding metering', () => {
  beforeEach(() => {
    embed.mockReset()
    dbExecute.mockReset()
  })

  it('does not call raw Voyage from storyteller entity services', () => {
    for (const path of [
      EntityGraphSource.GraphService,
      EntityGraphSource.RegistryEmbedding,
      EntityGraphSource.RegistryService,
    ]) {
      const source = readFileSync(path, 'utf8')
      expect(source).not.toContain(VoyageForbidden.GetClient)
      expect(source).not.toContain(VoyageForbidden.EmbedDocuments)
    }
  })

  it('builds embeddings through gateway RagEmbedding with ProjectScope', async () => {
    embed.mockResolvedValue([[0.1, 0.2, 0.3]])
    dbExecute.mockResolvedValue({ rows: [] })

    const wrote = await entityGraphService.buildEntityEmbedding(
      'ent-1',
      'Character: Anne. A harbour spy.',
      SCOPE
    )

    expect(wrote).toBe(true)
    expect(embed).toHaveBeenCalledWith({
      scope: SCOPE,
      feature: LlmFeature.RagEmbedding,
      texts: ['Character: Anne. A harbour spy.'],
    })
    expect(dbExecute).toHaveBeenCalled()
  })
})
