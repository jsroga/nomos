import { describe, expect, it } from 'vitest'
import {
  createToolArgsSnapshotSelector,
  toolArgsFromAssistantContent,
  toolNameFromAssistantPart,
} from '../tool-args-from-assistant-content'

describe('toolNameFromAssistantPart', () => {
  it('reads AI SDK static tool types', () => {
    expect(toolNameFromAssistantPart({ type: 'tool-update_world_bible' })).toBe(
      'update_world_bible',
    )
  })

  it('reads dynamic-tool and assistant-ui toolName fields', () => {
    expect(
      toolNameFromAssistantPart({ type: 'dynamic-tool', toolName: 'propose_character_fields' }),
    ).toBe('propose_character_fields')
    expect(toolNameFromAssistantPart({ type: 'tool-call', toolName: 'list_characters' })).toBe(
      'list_characters',
    )
  })

  it('ignores generic assistant-ui tool part types', () => {
    expect(toolNameFromAssistantPart({ type: 'tool-call' })).toBeNull()
    expect(toolNameFromAssistantPart({ type: 'text' })).toBeNull()
  })
})

describe('toolArgsFromAssistantContent', () => {
  it('reads worldDescription from tool args on the message', () => {
    const args = toolArgsFromAssistantContent([
      { args: { worldDescription: 'Linked overview prose.', items: [] } },
    ])
    expect(args).toEqual([{ worldDescription: 'Linked overview prose.', items: [] }])
  })

  it('ignores text-only parts', () => {
    expect(toolArgsFromAssistantContent([{ args: undefined }])).toEqual([])
  })

  it('caches getSnapshot results by content identity and value', () => {
    const select = createToolArgsSnapshotSelector()
    const content = [{ args: { worldDescription: 'Linked overview prose.' } }]
    const first = select(content)
    const second = select(content)
    expect(first).toBe(second)

    const clone = [{ args: { worldDescription: 'Linked overview prose.' } }]
    const third = select(clone)
    expect(third).toBe(first)
  })
})
