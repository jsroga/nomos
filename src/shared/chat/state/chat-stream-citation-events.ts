import { ChatFrameType } from '../core/protocol'
import { asNumber, asRecord, asString, StreamPayloadField } from './chat-stream-payload-helpers'
import type { Citation } from '../ui/CitationDisplay'
import type { Dispatch, SetStateAction } from 'react'

function frameType(data: Record<string, unknown>): string | undefined {
  return asString(data.type)
}

function isCitation(value: unknown): value is Citation {
  if (typeof value !== 'object' || value === null) return false
  return (
    StreamPayloadField.Id in value &&
    typeof value[StreamPayloadField.Id] === 'string'
  )
}

function parseCitations(data: Record<string, unknown>): Citation[] {
  if (Array.isArray(data.citations)) {
    return data.citations.filter(isCitation)
  }
  if (isCitation(data.citation)) {
    return [data.citation]
  }
  return []
}

export function processCitationEventData(
  setCitations: Dispatch<SetStateAction<Citation[]>>,
  setGroundingScore: Dispatch<SetStateAction<number | null>>,
  data: Record<string, unknown>,
  onCitationsUpdate?: (citations: Citation[]) => void,
  onGroundingUpdate?: (score: number, details: Record<string, unknown>) => void
): void {
  const type = frameType(data)
  if (type === ChatFrameType.Citation || type === ChatFrameType.Citations) {
    const newCitations = parseCitations(data)

    setCitations(prev => {
      const existingIds = new Set(prev.map(c => c.id))
      const unique = newCitations.filter(c => !existingIds.has(c.id))
      return [...prev, ...unique]
    })

    onCitationsUpdate?.(newCitations)
  } else if (type === ChatFrameType.Grounding) {
    const score = asNumber(data.score)
    if (score === undefined) return
    setGroundingScore(score)
    onGroundingUpdate?.(score, asRecord(data.details) ?? {})
  }
}
