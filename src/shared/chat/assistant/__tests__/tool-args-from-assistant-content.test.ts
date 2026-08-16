import { describe, expect, it } from 'vitest'
import {
  createToolArgsSnapshotSelector,
  toolArgsFromAssistantContent,
} from '../tool-args-from-assistant-content'

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
