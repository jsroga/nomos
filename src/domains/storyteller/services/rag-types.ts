import { RagDocumentType } from '@/domains/storyteller/services/constants/rag-document-type'

export type DocumentType = `${RagDocumentType}`

export interface RagResult {
  id: string
  content: string
  metadata: Record<string, unknown>
  similarity: number
  citation?: CitationInfo
}

export interface CitationInfo {
  id: string
  marker: string
  source: string
  chunkId: string
  confidence: number
}

export interface RetrieveOptions {
  limit?: number
  useQueryExpansion?: boolean
  useReranking?: boolean
  documentType?: DocumentType
}
