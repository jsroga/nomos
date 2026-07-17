import {
  Message,
  AgentAction,
  QuestionSession,
} from '../core/types'
import { Citation } from '../ui/CitationDisplay'

export interface UseChatStreamProps {
  initialMessages?: Message[]
  onAction?: (action: AgentAction) => Promise<void>
  onQuestion?: (question: QuestionSession) => void
  onStreamingUpdate?: (data: Record<string, unknown>) => void
  onCitationsUpdate?: (citations: Citation[]) => void
  onGroundingUpdate?: (score: number, details: Record<string, unknown>) => void
  onSectionLoading?: (section: string, loading: boolean, message?: string) => void
  onComplete?: () => void
  persistKey?: string
  sessionId?: string
  projectId?: string
  episodeId?: string
  userId?: string
  verboseUiEnabled?: boolean
  resumeUrl?: string
}
