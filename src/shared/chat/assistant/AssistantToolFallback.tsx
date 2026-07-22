'use client'

/**
 * Generic tool-call renderer for the assistant-ui Thread (B2). Makes agent tool
 * activity visible (name · args · result) — the parity replacement for the old
 * agent-log — and renders Approve/Deny when a tool call requires human approval
 * (`status.type === 'requires-action'`), driving Mastra's native tool-approval
 * resume through `respondToApproval`.
 *
 * Approval buttons only appear when a Mastra tool opts into `requireApproval`;
 * until then this is purely the activity view. HITL agent *questions* (the old
 * QuestionComponent flow) are a follow-up (tracked).
 */

import type { ToolCallMessagePartComponent } from '@assistant-ui/react'

const REQUIRES_ACTION = 'requires-action'
const APPROVE_LABEL = 'Approve'
const DENY_LABEL = 'Deny'

function stringify(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2)
}

export const AssistantToolFallback: ToolCallMessagePartComponent = ({
  toolName,
  args,
  result,
  status,
  respondToApproval,
}) => {
  const needsApproval = status.type === REQUIRES_ACTION

  return (
    <div className="my-1 rounded-md border border-black/10 p-2 text-xs dark:border-white/10">
      <div className="font-medium opacity-80">🛠 {toolName}</div>

      {args != null && (
        <pre className="mt-1 overflow-x-auto whitespace-pre-wrap opacity-60">{stringify(args)}</pre>
      )}
      {result != null && (
        <pre className="mt-1 overflow-x-auto whitespace-pre-wrap opacity-70">{stringify(result)}</pre>
      )}

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
