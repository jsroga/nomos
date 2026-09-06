import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  characterNameCollisions,
  literalManuscriptHits,
  ManuscriptSearchSource,
} from '../search-manuscript-literal'
import { SEARCH_MANUSCRIPT_TOOL_ID } from '../manage-tools-wire'
import { searchManuscriptTool } from '../search-manuscript'
import { cosineSimilarity, ManuscriptSearchMode } from '../search-manuscript-embed'
import { resolveManuscriptHits } from '../search-manuscript-resolve'
import { costUsdFor } from '@/shared/ai/gateway/record'

enum Plant {
  Exact = 'the silver bell under the floorboard',
  Paraphrase = 'a hidden chime waits beneath the boards',
}

const DOCS = [
  {
    source: ManuscriptSearchSource.Beat,
    id: 'beat-1',
    text: `Vera lifts ${Plant.Exact} and pockets it.`,
  },
]

describe('search_manuscript literal', () => {
  it('hits an exact plant string', () => {
    const hits = literalManuscriptHits(DOCS, Plant.Exact)
    expect(hits).toHaveLength(1)
    expect(hits[0]?.source).toBe(ManuscriptSearchSource.Beat)
    expect(hits[0]?.snippet.toLowerCase()).toContain('silver bell')
  })

  it('misses a paraphrase of the same plant', () => {
    expect(literalManuscriptHits(DOCS, Plant.Paraphrase)).toEqual([])
  })

  it('lists two characters that share a name token', () => {
    const collisions = characterNameCollisions(
      [
        { id: 'c1', name: 'Anne Bell' },
        { id: 'c2', name: 'Tom Bell' },
        { id: 'c3', name: 'Vera' },
      ],
      'Bell'
    )
    expect(collisions.map(row => row.name)).toEqual(['Anne Bell', 'Tom Bell'])
  })

  it('queries live setups rows', () => {
    const source = readFileSync('src/domains/storyteller/ai/tools/search-manuscript.ts', 'utf8')
    expect(source).toContain('from(setups)')
  })

  it('keeps the search_manuscript tool id stable and read-only', () => {
    expect(searchManuscriptTool.id).toBe(SEARCH_MANUSCRIPT_TOOL_ID)
    const source = readFileSync('src/domains/storyteller/ai/tools/search-manuscript.ts', 'utf8')
    expect(source).not.toContain('.insert(')
    expect(source).not.toContain('.update(')
    expect(source).not.toContain('.delete(')
    expect(source).not.toContain('getVoyageEmbeddings')
    expect(source).not.toContain('embedDocuments(')
  })
})

describe('search_manuscript embedding after literal miss', () => {
  it('finds a paraphrase plant by cosine, not by literal', async () => {
    expect(literalManuscriptHits(DOCS, Plant.Paraphrase)).toEqual([])
    const shared = [1, 0, 0]
    const resolved = await resolveManuscriptHits({
      docs: DOCS,
      query: Plant.Paraphrase,
      embedTexts: async texts => texts.map(() => shared),
    })
    expect(resolved.mode).toBe(ManuscriptSearchMode.Embedding)
    expect(resolved.hits).toHaveLength(1)
    expect(resolved.hits[0]?.id).toBe('beat-1')
    expect(cosineSimilarity(shared, shared)).toBe(1)
  })

  it('skips embedding when no gateway embedder is provided', async () => {
    const resolved = await resolveManuscriptHits({
      docs: DOCS,
      query: Plant.Paraphrase,
    })
    expect(resolved.mode).toBe(ManuscriptSearchMode.Literal)
    expect(resolved.hits).toEqual([])
  })

  it('does not invent a Voyage client on the search path', () => {
    const embedSource = readFileSync(
      'src/domains/storyteller/ai/tools/search-manuscript-embed.ts',
      'utf8'
    )
    const resolveSource = readFileSync(
      'src/domains/storyteller/ai/tools/search-manuscript-resolve.ts',
      'utf8'
    )
    expect(embedSource).not.toContain('getVoyageEmbeddings')
    expect(embedSource).not.toContain('embedDocuments(')
    expect(resolveSource).not.toContain('getVoyageEmbeddings')
    expect(resolveSource).not.toContain('embedDocuments(')
  })

  it('throws on an unknown embedding model instead of recording cost 0', () => {
    expect(() => costUsdFor('someone/unreleased-embed', 1000, 0)).toThrow()
  })
})
