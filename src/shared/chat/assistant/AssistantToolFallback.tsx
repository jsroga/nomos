'use client'

/**
 * Generic tool-call renderer for the assistant-ui Thread (B2). Makes agent tool
 * activity visible (name · args · result) — the parity replacement for the old
 * agent-log — and renders Approve/Deny when a tool call requires human approval
 * (`status.type === 'requires-action'`), driving Mastra's native tool-approval
 * resume through `respondToApproval`.
 */

import type { ToolCallMessagePartComponent } from '@assistant-ui/react'
import { useAssistantChatDetails } from './AssistantChatDetailsContext'

enum ToolPartStatusType {
  RequiresAction = 'requires-action',
  Running = 'running',
  Incomplete = 'incomplete',
  Complete = 'complete',
}

enum ToolPartStatusLabel {
  Running = 'running',
  Incomplete = 'incomplete',
  Complete = 'done',
  NeedsApproval = 'needs approval',
}

const APPROVE_LABEL = 'Approve'
const DENY_LABEL = 'Deny'

function stringify(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2)
}

function statusLabel(type: string): string {
  switch (type) {
    case ToolPartStatusType.Running:
      return ToolPartStatusLabel.Running
    case ToolPartStatusType.Incomplete:
      return ToolPartStatusLabel.Incomplete
    case ToolPartStatusType.Complete:
      return ToolPartStatusLabel.Complete
    case ToolPartStatusType.RequiresAction:
      return ToolPartStatusLabel.NeedsApproval
    default:
      return type
  }
}

export const AssistantToolFallback: ToolCallMessagePartComponent = ({
  toolName,
  args,
  result,
  status,
  respondToApproval,
}) => {
  const { showDetails } = useAssistantChatDetails()
  const needsApproval = status.type === ToolPartStatusType.RequiresAction
  const isRunning = status.type === ToolPartStatusType.Running

  return (
    <div className="my-1 rounded-md border border-black/10 p-2 text-xs dark:border-white/10">
      <div className="flex items-center gap-2 font-medium opacity-80">
        <span>🛠 {toolName}</span>
        <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${
          isRunning
            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300'
            : 'bg-black/5 text-black/50 dark:bg-white/10 dark:text-white/50'
        }`}>
          {statusLabel(status.type)}
        </span>
      </div>

      {showDetails && args != null ? (
        <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap opacity-60">
          {stringify(args)}
        </pre>
      ) : null}
      {showDetails && result != null ? (
        <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap opacity-70">
          {stringify(result)}
        </pre>
      ) : null}

      {needsApproval && (
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => respondToApproval({ approved: true })}
            className="rounded bg-black px-2 py-1 text-white dark:bg-white dark:text-black"
          >
            {APPROVE_LABEL}
          </button>
          <button
            type="button"
            onClick={() => respondToApproval({ approved: false })}
            className="rounded border border-black/20 px-2 py-1 dark:border-white/20"
          >
            {DENY_LABEL}
          </button>
        </div>
      )}
    </div>
  )
}
