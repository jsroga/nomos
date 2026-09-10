import { describe, expect, it } from 'vitest'
import { ChatMessageRole, ChatPartType } from '@/shared/chat/core/utils/assistant-thread-ui'
import {
  OverlayHistoryMessageFormat,
  OverlayMemoryPartType,
  mastraMemoryToUiMessages,
  shouldHydrateOverlayMessages,
  uiMessagesToHistoryEntries,
} from '../mastra-memory-to-ui-messages'

describe('mastraMemoryToUiMessages', () => {
  it('maps Mastra format-2 rows into AI SDK UI messages oldest first', () => {
    const messages = mastraMemoryToUiMessages([
      {
        id: 'a2',
        role: ChatMessageRole.Assistant,
        createdAt: '2026-01-01T00:00:02.000Z',
        content: { format: 2, parts: [{ type: ChatPartType.Text, text: 'Winterfell stands' }] },
      },
      {
        id: 'u1',
        role: ChatMessageRole.User,
        createdAt: '2026-01-01T00:00:01.000Z',
        content: { format: 2, parts: [{ type: ChatPartType.Text, text: 'Draft the siege' }] },
      },
    ])
    expect(messages.map(row => row.id)).toEqual(['u1', 'a2'])
    expect(messages[0]).toEqual({
      id: 'u1',
      role: ChatMessageRole.User,
      parts: [{ type: ChatPartType.Text, text: 'Draft the siege' }],
    })
    expect(messages[1]?.parts).toEqual([{ type: ChatPartType.Text, text: 'Winterfell stands' }])
  })

  it('keeps already-UI messages and Mastra reasoning parts', () => {
    const messages = mastraMemoryToUiMessages([
      {
        id: 'u1',
        role: ChatMessageRole.User,
        parts: [{ type: ChatPartType.Text, text: 'Regenerate soundtracks' }],
      },
      {
        id: 'a1',
        role: ChatMessageRole.Assistant,
        content: {
          parts: [
            { type: OverlayMemoryPartType.Reasoning, reasoning: 'pick winter tracks' },
            { type: ChatPartType.Text, text: 'Here are three cues' },
          ],
        },
      },
    ])
    expect(messages).toHaveLength(2)
    expect(messages[1]?.parts).toEqual([
      { type: OverlayMemoryPartType.Reasoning, text: 'pick winter tracks' },
      { type: ChatPartType.Text, text: 'Here are three cues' },
    ])
  })

  it('skips nameless rows and empty content so a dead StoredEntry filter cannot wipe the thread', () => {
    expect(
      mastraMemoryToUiMessages([
        { role: ChatMessageRole.User, content: 'no id' },
        { id: 'blank', role: ChatMessageRole.Assistant, content: { format: 2, parts: [] } },
        { id: 'ok', role: ChatMessageRole.User, content: 'Hello' },
      ]),
    ).toEqual([
      { id: 'ok', role: ChatMessageRole.User, parts: [{ type: ChatPartType.Text, text: 'Hello' }] },
    ])
  })
})

describe('uiMessagesToHistoryEntries', () => {
  it('writes ai-sdk/v6 entries the overlay withFormat path can decode', () => {
    const entries = uiMessagesToHistoryEntries([
      {
        id: 'u1',
        role: ChatMessageRole.User,
        parts: [{ type: ChatPartType.Text, text: 'Hi' }],
      },
      {
        id: 'a1',
        role: ChatMessageRole.Assistant,
        parts: [{ type: ChatPartType.Text, text: 'Hello' }],
      },
    ])
    expect(entries[0]?.format).toBe(OverlayHistoryMessageFormat.AiSdkV6)
    expect(entries[1]?.parent_id).toBe('u1')
    expect(entries[1]?.content.role).toBe(ChatMessageRole.Assistant)
  })
})

describe('shouldHydrateOverlayMessages', () => {
  it('applies history only onto an empty live thread', () => {
    expect(shouldHydrateOverlayMessages(0, 2)).toBe(true)
    expect(shouldHydrateOverlayMessages(1, 2)).toBe(false)
    expect(shouldHydrateOverlayMessages(0, 0)).toBe(false)
  })
})
