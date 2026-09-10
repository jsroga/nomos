import { describe, expect, it } from 'vitest'
import { ChatMessageStatus, ChatPartType, ChatToolPartPrefix } from '../../core/utils/assistant-thread-ui'
import {
  createShowThinkingSelector,
  hasRenderableAssistantContent,
} from '../assistant-message-selectors'

describe('hasRenderableAssistantContent', () => {
  it('treats streamed reasoning as visible so wait-dots do not hide thoughts', () => {
    expect(
      hasRenderableAssistantContent([
        { type: ChatPartType.Reasoning, text: 'The next beat is the revelation scene.' },
      ]),
    ).toBe(true)
  })

  it('is empty until the first token arrives', () => {
    expect(hasRenderableAssistantContent([])).toBe(false)
    expect(hasRenderableAssistantContent([{ type: ChatPartType.Reasoning, text: '  ' }])).toBe(
      false,
    )
  })

  it('does not treat step frames as visible output', () => {
    expect(
      hasRenderableAssistantContent([
        { type: ChatPartType.StepStart },
        { type: ChatPartType.StepFinish },
      ]),
    ).toBe(false)
  })

  it('counts tools as visible decisions', () => {
    expect(
      hasRenderableAssistantContent([{ type: `${ChatToolPartPrefix.Tool}run_beat_draft_workflow` }]),
    ).toBe(true)
    expect(
      hasRenderableAssistantContent([{ type: `${ChatToolPartPrefix.Tool}update_world_bible` }]),
    ).toBe(true)
  })
})

describe('createShowThinkingSelector', () => {
  it('shows the first-token wait only while running with nothing to render', () => {
    const select = createShowThinkingSelector()
    expect(
      select({ status: { type: ChatMessageStatus.Running }, content: [] }),
    ).toBe(true)
    expect(
      select({
        status: { type: ChatMessageStatus.Running },
        content: [{ type: ChatPartType.StepStart }],
      }),
    ).toBe(true)
    expect(
      select({
        status: { type: ChatMessageStatus.Running },
        content: [{ type: ChatPartType.Reasoning, text: 'Draft the brief.' }],
      }),
    ).toBe(false)
    expect(
      select({
        status: { type: ChatMessageStatus.Running },
        content: [{ type: `${ChatToolPartPrefix.Tool}update_world_bible` }],
      }),
    ).toBe(false)
  })
})
