// @vitest-environment jsdom

import { readFileSync } from 'node:fs'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppModuleId } from '@/shared/data/constants/protocol'
import { TourStepId } from '@/shared/tours/constants/tour-step-ids'
import { persistWorkspaceChatOverlayOpen } from '@/shared/chat/state/utils/workspace-chat-overlay-open'
import { useWorkspaceChatUiStore } from '@/shared/chat/state/workspace-chat-ui-store'
import { browserStorage } from '@/shared/data/browser-storage'
import { LocalStorageKeys } from '@/shared/data/utils/localStorage'

const PROJECT_ID = '11111111-1111-4111-8111-111111111111'
const OVERLAY_SRC = 'src/shared/chat/ui/WorkspaceChatOverlay/WorkspaceChatOverlay.tsx'
const HYDRATE_SRC = 'src/shared/chat/ui/WorkspaceChatOverlay/use-hydrated-overlay-open.ts'
const RUNTIME_SRC = 'src/shared/chat/ui/WorkspaceChatOverlay/WorkspaceChatSessionRuntime.tsx'

vi.mock('next/navigation', () => ({
  usePathname: () => `/${PROJECT_ID}/${AppModuleId.Storyteller}`,
  useParams: () => ({ projectId: PROJECT_ID }),
}))

vi.mock('@/shared/chat/core/io/chat-sessions.api', () => ({
  listChatSessions: async () => [],
  createChatSession: vi.fn(),
  markChatSessionIdle: vi.fn(),
  markChatSessionStreaming: vi.fn(),
}))

import { WorkspaceChatOverlay } from '../WorkspaceChatOverlay'
import { WorkspaceChatClass } from '../workspace-chat-copy'

describe('workspace chat overlay visibility', () => {
  it('hides with CSS instead of unmounting when overlayOpen is false', () => {
    const src = readFileSync(OVERLAY_SRC, 'utf8')
    expect(src).toContain('useHydratedWorkspaceChatOverlayOpen')
    const hydrateSrc = readFileSync(HYDRATE_SRC, 'utf8')
    expect(hydrateSrc).toContain('storedWorkspaceChatOverlayOpen')
    expect(hydrateSrc).toContain('useLayoutEffect')
    expect(src).toContain('hidden={!overlayOpen}')
    expect(src).toContain('aria-hidden={!overlayOpen}')
    expect(src).not.toMatch(/\{overlayOpen\s*&&/)
    expect(src).toContain('key={session.id}')
    expect(src).not.toContain('key={focusedSessionId}')
    expect(src).toContain('streamingSessionsWithoutRunId')
    expect(src).toContain('selectFocusedSessionId')
    expect(src).toContain('markChatSessionIdle')
    expect(src).toContain('useEnsureFocusedOverlaySession')
    expect(src).not.toContain('chat/stream')
    expect(src).not.toContain('sendMessage')
    expect(src).not.toMatch(/stop\(\)/)
    expect(src).toContain('<WorkspaceChatMismatchDialog')
    const asideClose = src.lastIndexOf('</aside>')
    expect(src.indexOf('<WorkspaceChatMismatchDialog')).toBeGreaterThan(asideClose)
    expect(readFileSync('src/shared/chat/ui/WorkspaceChatOverlay/workspace-chat-copy.ts', 'utf8')).toContain(
      'ml-auto',
    )
    expect(WorkspaceChatClass.Panel).toContain('border-l-0')
    expect(WorkspaceChatClass.PanelHidden).toContain('border-l-0')
  })

  it('does not remount one AssistantChat on focusedSessionId', () => {
    const runtime = readFileSync(RUNTIME_SRC, 'utf8')
    expect(runtime).not.toContain('key={focusedSessionId}')
    expect(runtime).toContain('hidden')
    expect(runtime).toContain('aria-hidden')
  })

  it('puts session history in a dropdown beside New Chat and swaps pencil for save', () => {
    const list = readFileSync('src/shared/chat/ui/WorkspaceChatOverlay/WorkspaceChatSessionList.tsx', 'utf8')
    const item = readFileSync('src/shared/chat/ui/WorkspaceChatOverlay/WorkspaceChatHistoryItem.tsx', 'utf8')
    expect(list).toContain('DropdownMenu')
    expect(list).toContain('WorkspaceChatCopy.History')
    expect(list).toContain('WorkspaceChatCopy.NewChat')
    expect(list).toContain('WorkspaceChatClass.SessionBar')
    expect(list).toContain('WorkspaceChatClass.SessionBarNew')
    expect(list).toContain('WorkspaceChatClass.SessionBarHistory')
    expect(list).not.toContain('ButtonSizeKey')
    expect(readFileSync('src/shared/chat/ui/WorkspaceChatOverlay/workspace-chat-copy.ts', 'utf8')).toContain(
      'h-[50px]',
    )
    expect(WorkspaceChatClass.SessionBarNew).toContain('h-8')
    expect(WorkspaceChatClass.SessionBarHistory).toContain('h-8')
    expect(WorkspaceChatClass.SessionBarHistory).toContain('w-8')
    expect(WorkspaceChatClass.HistoryItem).toContain('py-0.5')
    expect(WorkspaceChatClass.HistoryItemAction).toContain('h-6')
    expect(list).toContain('prependCreatedChatSession')
    expect(list).toContain('setFocusedSessionId(created.id, created.moduleId)')
    expect(list).not.toMatch(/<ul[\s>]/)
    expect(item).toContain('workspaceChatRenameGlyph')
    expect(item).toContain('<Save')
    expect(item).toContain('<Pencil')
  })
})

describe('workspace chat overlay mount', () => {
  let container: HTMLElement
  let root: Root | undefined

  beforeAll(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  })

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    browserStorage.remove(LocalStorageKeys.WORKSPACE_CHAT_OVERLAY_OPEN)
    useWorkspaceChatUiStore.setState({ overlayOpen: false, focusedSessionId: null })
  })

  afterEach(() => {
    act(() => {
      root?.unmount()
    })
    container.remove()
  })

  it('keeps the overlay node in the tree when closed', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    await act(async () => {
      root = createRoot(container)
      root.render(
        <QueryClientProvider client={client}>
          <WorkspaceChatOverlay adapters={{}} />
        </QueryClientProvider>,
      )
    })
    const aside = container.querySelector('aside')
    expect(aside).not.toBeNull()
    expect(aside?.hidden).toBe(true)
    expect(aside?.getAttribute('aria-hidden')).toBe('true')
    expect(aside?.id).toBe(TourStepId.STORYTELLER_CHAT)
  })

  it('hides when storage is closed even if the store still says open', async () => {
    persistWorkspaceChatOverlayOpen(false)
    useWorkspaceChatUiStore.setState({ overlayOpen: true, focusedSessionId: null })
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    await act(async () => {
      root = createRoot(container)
      root.render(
        <QueryClientProvider client={client}>
          <WorkspaceChatOverlay adapters={{}} />
        </QueryClientProvider>,
      )
    })
    const aside = container.querySelector('aside')
    expect(aside).not.toBeNull()
    expect(aside?.hidden).toBe(true)
    expect(aside?.getAttribute('aria-hidden')).toBe('true')
  })
})
