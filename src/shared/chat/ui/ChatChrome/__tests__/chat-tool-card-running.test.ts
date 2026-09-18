import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const CARD = 'src/shared/chat/ui/ChatChrome/ChatToolCard.tsx'
const FALLBACK = 'src/shared/chat/assistant/AssistantToolFallback.tsx'

describe('running tool chrome', () => {
  it('renders a centered spinner instead of the Running title', () => {
    const src = readFileSync(CARD, 'utf8')
    expect(src).toContain('busy')
    expect(src).toContain('ChatChromeClass.ToolRunning')
    expect(src).toContain('ChatChromeClass.ToolSpinner')
    expect(src).toContain('CHAT_CHROME_COPY.Running')
  })

  it('keeps the tool card static outside debug details', () => {
    const src = readFileSync(FALLBACK, 'utf8')
    expect(src).toContain('busy={running}')
    expect(src).toContain('interactive={showDetails && !running}')
    expect(src).toContain('uniqueToolNames')
  })
})
