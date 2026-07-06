/**
 * Unit tests for useChatStream hook - Action Status Management
 */
import { describe, it, expect } from 'vitest'
import { Message, ActionStatus, AgentAction } from '../core/types'

// Mock implementation of updateActionStatus logic (extracted for unit testing)
function updateActionStatusInMessages(
  messages: Message[],
  messageIndex: number,
  actionIndex: number,
  status: ActionStatus
): Message[] {
  return messages.map((msg, mIdx) => {
    if (mIdx !== messageIndex || !msg.actions) return msg
    return {
      ...msg,
      actions: msg.actions.map((action, aIdx) =>
        aIdx === actionIndex ? { ...action, status } : action
      ),
    }
  })
}

describe('useChatStream Unit Tests - Action Status Management', () => {
  describe('updateActionStatusInMessages', () => {
    it('should update action status at correct indices', () => {
      const messages: Message[] = [
        { content: 'Hello', type: 'human' },
        {
          content: 'Here are some actions',
          type: 'ai',
          actions: [
            { type: 'UPDATE_SOUNDTRACKS', payload: { tracks: [] } },
            { type: 'UPDATE_WORLD_RULES', payload: { rules: [] } },
          ],
        },
        { content: 'More text', type: 'ai' },
      ]

      const updated = updateActionStatusInMessages(messages, 1, 0, 'executing')

      expect(updated[1].actions![0].status).toBe('executing')
      expect(updated[1].actions![1].status).toBeUndefined()
    })

    it('should not mutate original messages array', () => {
      const originalAction: AgentAction = { type: 'TEST', payload: {} }
      const messages: Message[] = [
        {
          content: 'Test',
          type: 'ai',
          actions: [originalAction],
        },
      ]

      const updated = updateActionStatusInMessages(messages, 0, 0, 'committed')

      expect(messages[0].actions![0].status).toBeUndefined()
      expect(updated[0].actions![0].status).toBe('committed')
    })

    it('should handle non-existent message index gracefully', () => {
      const messages: Message[] = [
        { content: 'Only one', type: 'ai', actions: [{ type: 'TEST', payload: {} }] },
      ]

      const updated = updateActionStatusInMessages(messages, 99, 0, 'committed')

      expect(updated.length).toBe(1)
      expect(updated[0].actions![0].status).toBeUndefined()
    })

    it('should handle message without actions', () => {
      const messages: Message[] = [{ content: 'No actions here', type: 'ai' }]

      const updated = updateActionStatusInMessages(messages, 0, 0, 'committed')

      expect(updated[0].actions).toBeUndefined()
    })

    it('should preserve other message properties', () => {
      const messages: Message[] = [
        {
          content: 'With metadata',
          type: 'ai',
          sender: 'PremiseArchitect',
          confidence: 0.9,
          thinking: 'Some reasoning',
          actions: [{ type: 'TEST', payload: { data: 'important' } }],
        },
      ]

      const updated = updateActionStatusInMessages(messages, 0, 0, 'executing')

      expect(updated[0].sender).toBe('PremiseArchitect')
      expect(updated[0].confidence).toBe(0.9)
      expect(updated[0].thinking).toBe('Some reasoning')
      expect(updated[0].actions![0].payload.data).toBe('important')
    })
  })

  describe('Action Status Transitions', () => {
    it('should support full approval lifecycle: pending -> executing -> committed', () => {
      const messages: Message[] = [
        {
          content: 'Action message',
          type: 'ai',
          actions: [{ type: 'UPDATE_SOUNDTRACKS', payload: { tracks: ['Track 1'] } }],
        },
      ]

      // Start as pending (undefined)
      expect(messages[0].actions![0].status).toBeUndefined()

      // Transition to executing
      let updated = updateActionStatusInMessages(messages, 0, 0, 'executing')
      expect(updated[0].actions![0].status).toBe('executing')

      // Transition to committed
      updated = updateActionStatusInMessages(updated, 0, 0, 'committed')
      expect(updated[0].actions![0].status).toBe('committed')
    })

    it('should support rejection: pending -> rejected', () => {
      const messages: Message[] = [
        {
          content: 'Rejectable action',
          type: 'ai',
          actions: [{ type: 'UPDATE_FACTIONS', payload: {} }],
        },
      ]

      const updated = updateActionStatusInMessages(messages, 0, 0, 'rejected')
      expect(updated[0].actions![0].status).toBe('rejected')
    })

    it('should support rollback: executing -> pending (on error)', () => {
      const messages: Message[] = [
        {
          content: 'Failed action',
          type: 'ai',
          actions: [{ type: 'CREATE_BEAT', payload: {}, status: 'executing' }],
        },
      ]

      const updated = updateActionStatusInMessages(messages, 0, 0, 'pending')
      expect(updated[0].actions![0].status).toBe('pending')
    })
  })

  describe('Multiple Actions per Message', () => {
    it('should update only the targeted action', () => {
      const messages: Message[] = [
        {
          content: 'Multiple actions',
          type: 'ai',
          actions: [
            { type: 'UPDATE_SOUNDTRACKS', payload: {} },
            { type: 'UPDATE_WORLD_RULES', payload: {} },
            { type: 'UPDATE_FACTIONS', payload: {} },
          ],
        },
      ]

      // Approve only the second action
      const updated = updateActionStatusInMessages(messages, 0, 1, 'committed')

      expect(updated[0].actions![0].status).toBeUndefined()
      expect(updated[0].actions![1].status).toBe('committed')
      expect(updated[0].actions![2].status).toBeUndefined()
    })

    it('should handle concurrent updates to different actions', () => {
      let messages: Message[] = [
        {
          content: 'Concurrent test',
          type: 'ai',
          actions: [
            { type: 'ACTION_1', payload: {} },
            { type: 'ACTION_2', payload: {} },
          ],
        },
      ]

      // Simulate concurrent updates
      messages = updateActionStatusInMessages(messages, 0, 0, 'executing')
      messages = updateActionStatusInMessages(messages, 0, 1, 'committed')
      messages = updateActionStatusInMessages(messages, 0, 0, 'committed')

      expect(messages[0].actions![0].status).toBe('committed')
      expect(messages[0].actions![1].status).toBe('committed')
    })
  })
})
