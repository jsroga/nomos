import { documentEmbeddings } from '@/db'
import { db } from '@/db/client'
import { v4 as uuidv4 } from 'uuid'
import type { SemanticChunker } from '@/shared/ai/rag/semantic-chunker'
import { RagDocumentType } from '@/domains/storyteller/services/constants/rag-document-type'
import type { ProjectScope } from '@/shared/auth/project-scope'
import { embed } from '@/shared/ai/gateway'
import { LlmFeature } from '@/shared/ai/gateway/constants/llm-call'

export type RagDocumentTypeValue = `${RagDocumentType}`

export interface RagIngestOptions {
  documentType: RagDocumentTypeValue
  episodeId?: string
  characterId?: string
  beatId?: string
  agentName?: string
  chunkDocument?: boolean
}

export function shouldChunkDocumentType(documentType: RagDocumentTypeValue): boolean {
  const noChunkTypes: RagDocumentTypeValue[] = [RagDocumentType.BeatDecision, RagDocumentType.UserFeedback]
  return !noChunkTypes.includes(documentType)
}

export async function ingestChunkedDocument(
  scope: ProjectScope,
  content: string,
  options: RagIngestOptions,
  chunker: SemanticChunker
): Promise<void> {
  const { projectId } = scope
  const documentId = uuidv4()
  const chunks = chunker.chunkDocument(content, {
    documentId,
    projectId,
    documentType: options.documentType,
  })

  const chunkContents = chunks.map(c => c.content)
  const chunkEmbeddings = await embed({
    scope,
    feature: LlmFeature.RagEmbedding,
    texts: chunkContents,
  })

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    const metadata = {
      ...chunk.metadata,
      documentType: options.documentType,
      episodeId: options.episodeId,
      characterId: options.characterId,
      beatId: options.beatId,
      agentName: options.agentName,
      isChunk: true,
      parentDocumentId: documentId,
    }

    await db.insert(documentEmbeddings).values({
      id: chunk.id,
      projectId,
      content: chunk.content,
      metadata,
      embedding: chunkEmbeddings[i],
    })
  }

  console.log(`[RAG] Ingested ${chunks.length} chunks for document ${documentId}`)
}

export async function ingestSingleDocument(
  scope: ProjectScope,
  content: string,
  options: RagIngestOptions
): Promise<void> {
  const { projectId } = scope
  const [embedding] = await embed({
    scope,
    feature: LlmFeature.RagEmbedding,
    texts: [content],
  })
  const metadata = {
    documentType: options.documentType,
    episodeId: options.episodeId,
    characterId: options.characterId,
    beatId: options.beatId,
    agentName: options.agentName,
    timestamp: Date.now(),
    isChunk: false,
  }

  await db.insert(documentEmbeddings).values({
    projectId,
    content,
    metadata,
    embedding,
  })
}
