import type { Metadata } from 'next'
import Link from 'next/link'
import { AssistantChat } from '@/shared/chat/assistant/AssistantChat'
import { getCanvasModules } from '@/shared/canvas/module-registry'

const ASSISTANT_PAGE_TITLE = 'Assistant (preview)'
const ASSISTANT_ROUTE = '/assistant'
const MODULE_QUERY_PARAM = 'module'

export const metadata: Metadata = {
  title: ASSISTANT_PAGE_TITLE,
}

interface AssistantPageProps {
  searchParams: Promise<{ module?: string }>
}

/**
 * Multi-agent assistant-ui tester — pick a canvas module and chat with its
 * Mastra agent through the assistant-ui runtime (`/api/assistant/<agentId>`).
 * The proof-point for adopting assistant-ui per module before swapping the live
 * chats (roadmap Track B4 / C1).
 */
export default async function AssistantPreviewPage({ searchParams }: AssistantPageProps) {
  const { module: selectedKey } = await searchParams
  const modules = getCanvasModules().filter(m => m.chatAgentId)
  const active = modules.find(m => m.key === selectedKey) ?? modules[0]

  return (
    <div className="mx-auto flex h-screen max-w-3xl flex-col">
      <nav className="flex flex-wrap gap-2 border-b border-black/10 p-3 text-sm dark:border-white/10">
        {modules.map(module => (
          <Link
            key={module.key}
            href={`${ASSISTANT_ROUTE}?${MODULE_QUERY_PARAM}=${module.key}`}
            className={
              module.key === active?.key
                ? 'rounded-md bg-black px-3 py-1 text-white dark:bg-white dark:text-black'
                : 'rounded-md border border-black/15 px-3 py-1 dark:border-white/15'
            }
          >
            {module.label}
          </Link>
        ))}
      </nav>

      <div className="flex-1 overflow-hidden">
        {active ? (
          <AssistantChat key={active.key} moduleKey={active.key} />
        ) : (
          <p className="p-4 text-sm opacity-60">No chat-enabled modules registered.</p>
        )}
      </div>
    </div>
  )
}
