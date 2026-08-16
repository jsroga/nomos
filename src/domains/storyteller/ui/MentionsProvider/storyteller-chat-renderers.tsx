'use client'

/**
 * Storyteller's tenant renderers for the chat platform (PLAN-V2 3.1 / D7):
 * entity-reference chips via ChatEntityMarkdown, and the consistency payload via
 * ConsistencyMessage. Injected through `ChatRenderersProvider` around the
 * writers-room chat surface — the chat platform never imports these.
 */


import type { ChatRenderers } from '@/shared/chat'
import { ChatEntityMarkdown } from '@/domains/storyteller/ui/MentionsProvider/chat-entity-markdown'
import { ConsistencyMessage } from '@/domains/storyteller/ui/ConsistencyMessage'
import { recordFromJson } from '@/shared/data/json-guards'
import type { ConsistencyCheckResult } from '@/domains/storyteller/core/types/consistency-types'

/**
 * Narrow the platform's opaque consistency payload back to the domain type.
 * Only the storyteller stream sets it, so a structural spot-check suffices.
 */
function isConsistencyCheckResult(value: unknown): value is ConsistencyCheckResult {
  const record = recordFromJson(value)
  return Array.isArray(record.inconsistencies) && typeof record.summary === 'string'
}

export function createStorytellerChatRenderers(projectId?: string): ChatRenderers {
  return {
    hasRichMarkup: () => true,
    renderRichText: (text, { projectId: optsProjectId, inline }) =>
      !text ? (
        text
      ) : (
        <ChatEntityMarkdown
          text={text}
          projectId={optsProjectId ?? projectId}
          inline={inline}
        />
      ),
    renderConsistency: (result, { canUndo }) =>
      isConsistencyCheckResult(result) ? (
        <ConsistencyMessage result={result} canUndo={canUndo ?? false} />
      ) : null,
  }
}

export const storytellerChatRenderers = createStorytellerChatRenderers()
