import type { MutableRefObject, Dispatch, SetStateAction } from 'react'
import type {
  Message,
  AgentAction,
  ActivityLogEntry,
  QuestionSession,
} from '../core/types'
import type { AgentStatus, AgentStatusInfo } from '../ui/AgentLog'
import type { Citation } from '../ui/CitationDisplay'
import type { ProgressSection } from '../ui/SectionProgress'

export interface ChatStreamFrameContext {
  verboseUiRef: MutableRefObject<boolean>
  streamingTokensRef: MutableRefObject<string>
  thinkingAgent: string | null
  persistKey?: string
  localRoundCountRef: MutableRefObject<number>
  pendingActionsRef?: MutableRefObject<number>

  setThinkingAgent: Dispatch<SetStateAction<string | null>>
  setMessages: (updater: Message[] | ((prev: Message[]) => Message[])) => void
  setStreamingTokens: Dispatch<SetStateAction<string>>
  setStreamingSections: Dispatch<SetStateAction<ProgressSection[]>>
  setIsTokenStreaming: Dispatch<SetStateAction<boolean>>
  setCitations: Dispatch<SetStateAction<Citation[]>>
  setGroundingScore: Dispatch<SetStateAction<number | null>>
  setRoundCount: Dispatch<SetStateAction<number>>
  setIsAwaitingInput: Dispatch<SetStateAction<boolean>>
  setLoadingSections: Dispatch<
    SetStateAction<Record<string, { loading: boolean; message?: string }>>
  >
  setIsSending: Dispatch<SetStateAction<boolean>>
  setActiveAgents: Dispatch<SetStateAction<AgentStatusInfo[]>>

  onAction?: (action: AgentAction) => Promise<void>
  onQuestion?: (question: QuestionSession) => void
  onStreamingUpdate?: (data: Record<string, unknown>) => void
  onComplete?: () => void
  onSectionLoading?: (section: string, loading: boolean, message?: string) => void

  updateAgentStatus: (
    agent: string,
    status: AgentStatus,
    message?: string,
    details?: string
  ) => void
  appendActivityLog: (entry: ActivityLogEntry) => void
  processSectionEvent: (data: Record<string, unknown>) => void
  processCitationEvent: (data: Record<string, unknown>) => void
  scheduleTokenFlush: () => void
  cancelTokenFlush: () => void
}
