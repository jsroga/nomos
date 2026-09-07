import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ASSISTANT_CHAT_SHOW_DETAILS_DEFAULT } from '../AssistantChatDetailsContext'

const DETAILS_SRC = 'src/shared/chat/assistant/AssistantChatDetailsContext.tsx'
const REASONING_SRC = 'src/shared/chat/assistant/AssistantThreadMessages.tsx'
const TOOL_SRC = 'src/shared/chat/assistant/AssistantToolFallback.tsx'

describe('assistant chat debug details', () => {
  it('defaults Details on so thoughts and tool JSON are visible', () => {
    expect(ASSISTANT_CHAT_SHOW_DETAILS_DEFAULT).toBe(true)
    const src = readFileSync(DETAILS_SRC, 'utf8')
    expect(src).toContain('useState(ASSISTANT_CHAT_SHOW_DETAILS_DEFAULT)')
  })

  it('expands reasoning when Details is on and keeps tool args behind the same flag', () => {
    const reasoning = readFileSync(REASONING_SRC, 'utf8')
    const tools = readFileSync(TOOL_SRC, 'utf8')
    expect(reasoning).toContain('showDetails || open')
    expect(tools).toContain('showDetails && args')
    expect(tools).toContain('showDetails && result')
  })
})
