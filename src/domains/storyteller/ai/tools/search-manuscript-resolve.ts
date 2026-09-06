import '@/shared/data/server-guard'
import {
  literalManuscriptHits,
  type ManuscriptSearchDoc,
  type ManuscriptSearchHit,
} from './search-manuscript-literal'
import {
  chunkManuscriptText,
  embeddingManuscriptHits,
  ManuscriptSearchMode,
  type EmbeddedChunk,
} from './search-manuscript-embed'

export interface ResolveManuscriptHitsInput {
  docs: readonly ManuscriptSearchDoc[]
  query: string
  embedTexts?: (texts: string[]) => Promise<number[][]>
}

export interface ResolveManuscriptHitsResult {
  hits: ManuscriptSearchHit[]
  mode: ManuscriptSearchMode
}

function emptyLiteral(): ResolveManuscriptHitsResult {
  return { hits: [], mode: ManuscriptSearchMode.Literal }
}

function chunksForDocs(docs: readonly ManuscriptSearchDoc[]): EmbeddedChunk[] {
  const chunks: EmbeddedChunk[] = []
  for (const doc of docs) {
    for (const text of chunkManuscriptText(doc.text)) {
      chunks.push({ doc, text, vector: [] })
    }
  }
  return chunks
}

export async function resolveManuscriptHits(
  input: ResolveManuscriptHitsInput
): Promise<ResolveManuscriptHitsResult> {
  const literal = literalManuscriptHits(input.docs, input.query)
  if (literal.length > 0) {
    return { hits: literal, mode: ManuscriptSearchMode.Literal }
  }
  if (!input.embedTexts) return emptyLiteral()
  const prepared = chunksForDocs(input.docs)
  if (prepared.length === 0) return emptyLiteral()
  let vectors: number[][]
  try {
    vectors = await input.embedTexts([input.query, ...prepared.map(chunk => chunk.text)])
  } catch {
    return emptyLiteral()
  }
  const queryVector = vectors[0]
  if (!queryVector) return emptyLiteral()
  const embedded: EmbeddedChunk[] = []
  for (let index = 0; index < prepared.length; index += 1) {
    const vector = vectors[index + 1]
    const chunk = prepared[index]
    if (!vector || !chunk) continue
    embedded.push({ doc: chunk.doc, text: chunk.text, vector })
  }
  return {
    hits: embeddingManuscriptHits(queryVector, embedded, input.query),
    mode: ManuscriptSearchMode.Embedding,
  }
}
