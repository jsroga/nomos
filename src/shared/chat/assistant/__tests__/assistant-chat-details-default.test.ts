import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ASSISTANT_CHAT_SHOW_DETAILS_DEFAULT } from '../AssistantChatDetailsContext'
import { CHAT_CHROME_COPY } from '@/shared/chat/core/utils/chat-chrome'

const DETAILS_SRC = 'src/shared/chat/assistant/AssistantChatDetailsContext.tsx'
const REASONING_SRC = 'src/shared/chat/assistant/AssistantReasoningPart.tsx'
const THREAD_SRC = 'src/shared/chat/assistant/AssistantThreadMessages.tsx'
const TOOL_SRC = 'src/shared/chat/assistant/AssistantToolFallback.tsx'
const THOUGHT_SRC = 'src/shared/chat/ui/ChatChrome/ChatThought.tsx'

describe('assistant chat debug details', () => {
  it('defaults Details off because thought has its own bubble', () => {
    expect(ASSISTANT_CHAT_SHOW_DETAILS_DEFAULT).toBe(false)
    const src = readFileSync(DETAILS_SRC, 'utf8')
    expect(src).toContain('useState(() => defaultShowDetails(moduleKey))')
    expect(src).toContain('if (moduleKey === AppModuleId.LoopCreator) return false')
  })

  it('always mounts ChatThought and keeps tool JSON behind Details', () => {
    const reasoning = readFileSync(REASONING_SRC, 'utf8')
    const thread = readFileSync(THREAD_SRC, 'utf8')
    const tools = readFileSync(TOOL_SRC, 'utf8')
    const thought = readFileSync(THOUGHT_SRC, 'utf8')
    expect(thread).toContain('Reasoning: AssistantReasoningPart')
    expect(thread).not.toContain('REASONING_PEEK')
    expect(thread).not.toContain('aui-reasoning-text--peek')
    expect(reasoning).toContain('ChatThought')
    expect(reasoning).toContain('formatThoughtDurationLabel')
    expect(reasoning).not.toContain('showDetails')
    expect(reasoning).not.toContain('slice(')
    expect(thought).toContain('ChatChromeParagraphs')
    expect(thought).not.toContain('slice(')
    expect(tools).toContain('formatToolsCalledLabel')
    expect(tools).toContain('formatToolDebugLabel')
    expect(tools).toContain('compactToolAckMessage')
    expect(tools).toContain('toolCardBodyMessage')
    expect(tools).not.toContain('compactMessage ?? title')
    expect(tools).toContain('showDetails')
    expect(tools).toContain('toolName')
    expect(CHAT_CHROME_COPY.ToolCalledOne).toBe('1 tool was called')
  })
})
