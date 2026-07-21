import type { Metadata } from 'next'
import { AssistantChat } from '@/shared/chat/assistant/AssistantChat'

const ASSISTANT_PAGE_TITLE = 'Assistant (preview)'

export const metadata: Metadata = {
  title: ASSISTANT_PAGE_TITLE,
}

/**
 * Preview of the assistant-ui chat wired to the storyteller Mastra agent — the
 * seed for the @/shared/chat migration. Visit /assistant.
 */
export default function AssistantPreviewPage() {
  return (
    <div className="mx-auto flex h-screen max-w-3xl flex-col">
      <AssistantChat />
    </div>
  )
}
