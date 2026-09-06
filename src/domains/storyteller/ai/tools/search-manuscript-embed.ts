import '@/shared/data/server-guard'
import type { ManuscriptSearchDoc, ManuscriptSearchHit } from './search-manuscript-literal'
import { snippetAround } from './search-manuscript-literal'

export enum ManuscriptSearchMode {
  Literal = 'literal',
  Embedding = 'embedding',
}

enum EmbedChunk {
  Size = 280,
}

export function chunkManuscriptText(text: string): string[] {
  const trimmed = text.trim()
  if (trimmed.length === 0) return []
  if (trimmed.length <= EmbedChunk.Size) return [trimmed]
  const chunks: string[] = []
  for (let start = 0; start < trimmed.length; start += EmbedChunk.Size) {
    chunks.push(trimmed.slice(start, start + EmbedChunk.Size))
  }
  return chunks
}

export function cosineSimilarity(left: readonly number[], right: readonly number[]): number {
  if (left.length === 0 || left.length !== right.length) return 0
  let dot = 0
  let leftNorm = 0
  let rightNorm = 0
  for (let index = 0; index < left.length; index += 1) {
    const a = left[index] ?? 0
    const b = right[index] ?? 0
    dot += a * b
    leftNorm += a * a
    rightNorm += b * b
  }
  if (leftNorm === 0 || rightNorm === 0) return 0
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm))
}

export interface EmbeddedChunk {
  doc: ManuscriptSearchDoc
  text: string
  vector: number[]
}

export enum EmbedHitFloor {
  MinCosine = 0.72,
}

export function embeddingManuscriptHits(
  queryVector: readonly number[],
  chunks: readonly EmbeddedChunk[],
  query: string
): ManuscriptSearchHit[] {
  const ranked = chunks
    .map(chunk => ({
      chunk,
      score: cosineSimilarity(queryVector, chunk.vector),
    }))
    .filter(row => row.score >= EmbedHitFloor.MinCosine)
    .sort((left, right) => right.score - left.score)
  const seen = new Set<string>()
  const hits: ManuscriptSearchHit[] = []
  for (const row of ranked) {
    const key = `${row.chunk.doc.source}:${row.chunk.doc.id}`
    if (seen.has(key)) continue
    seen.add(key)
    hits.push({
      source: row.chunk.doc.source,
      id: row.chunk.doc.id,
      snippet: snippetAround(row.chunk.text, query) || row.chunk.text.slice(0, 80),
    })
  }
  return hits
}
