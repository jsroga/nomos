import { documentEmbeddings } from '@/db'
import { db } from '@/db/client'
import { v4 as uuidv4 } from 'uuid'
import type { VoyageEmbeddings } from '@/shared/ai/embeddings/voyage-embeddings'
import type { SemanticChunker } from '@/shared/ai/rag/semantic-chunker'
import { RagDocumentType } from '@/domains/storyteller/services/constants/rag-document-type'
import type { ProjectScope } from '@/shared/auth/project-scope'

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
  chunker: SemanticChunker,
  embeddings: VoyageEmbeddings
): Promise<void> {
  const { projectId } = scope
  const documentId = uuidv4()
  const chunks = chunker.chunkDocument(content, {
    documentId,
    projectId,
    documentType: options.documentType,
  })

  const chunkContents = chunks.map(c => c.content)
  const chunkEmbeddings = await embeddings.embedDocuments(chunkContents)

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
  options: RagIngestOptions,
  embeddings: VoyageEmbeddings
): Promise<void> {
  const { projectId } = scope
  const embedding = await embeddings.embedQuery(content)
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
