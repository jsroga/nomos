/**
 * Unit tests for useChatStream hook - Action Status Management
 */
import { describe, it, expect } from 'vitest'
import { Message, AgentAction, ApprovalActionStatus } from '../core/types'

// Mock implementation of updateActionStatus logic (extracted for unit testing)
function updateActionStatusInMessages(
  messages: Message[],
  messageIndex: number,
  actionIndex: number,
  status: ApprovalActionStatus
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

      const updated = updateActionStatusInMessages(messages, 1, 0, ApprovalActionStatus.EXECUTING)

      expect(updated[1].actions![0].status).toBe(ApprovalActionStatus.EXECUTING)
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

      const updated = updateActionStatusInMessages(messages, 0, 0, ApprovalActionStatus.COMMITTED)

      expect(messages[0].actions![0].status).toBeUndefined()
      expect(updated[0].actions![0].status).toBe(ApprovalActionStatus.COMMITTED)
    })

    it('should handle non-existent message index gracefully', () => {
      const messages: Message[] = [
        { content: 'Only one', type: 'ai', actions: [{ type: 'TEST', payload: {} }] },
      ]

      const updated = updateActionStatusInMessages(messages, 99, 0, ApprovalActionStatus.COMMITTED)

      expect(updated.length).toBe(1)
      expect(updated[0].actions![0].status).toBeUndefined()
    })

    it('should handle message without actions', () => {
      const messages: Message[] = [{ content: 'No actions here', type: 'ai' }]

      const updated = updateActionStatusInMessages(messages, 0, 0, ApprovalActionStatus.COMMITTED)

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

      const updated = updateActionStatusInMessages(messages, 0, 0, ApprovalActionStatus.EXECUTING)

      expect(updated[0].sender).toBe('PremiseArchitect')
      expect(updated[0].confidence).toBe(0.9)
      expect(updated[0].thinking).toBe('Some reasoning')
      const payload = updated[0].actions![0].payload as { data: string }
      expect(payload.data).toBe('important')
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

      expect(messages[0].actions![0].status).toBeUndefined()

      let updated = updateActionStatusInMessages(messages, 0, 0, ApprovalActionStatus.EXECUTING)
      expect(updated[0].actions![0].status).toBe(ApprovalActionStatus.EXECUTING)

      updated = updateActionStatusInMessages(updated, 0, 0, ApprovalActionStatus.COMMITTED)
      expect(updated[0].actions![0].status).toBe(ApprovalActionStatus.COMMITTED)
    })

    it('should support rejection: pending -> rejected', () => {
      const messages: Message[] = [
        {
          content: 'Rejectable action',
          type: 'ai',
          actions: [{ type: 'UPDATE_FACTIONS', payload: {} }],
        },
      ]

      const updated = updateActionStatusInMessages(messages, 0, 0, ApprovalActionStatus.REJECTED)
      expect(updated[0].actions![0].status).toBe(ApprovalActionStatus.REJECTED)
    })

    it('should support rollback: executing -> pending (on error)', () => {
      const messages: Message[] = [
        {
          content: 'Failed action',
          type: 'ai',
          actions: [{ type: 'CREATE_BEAT', payload: {}, status: ApprovalActionStatus.EXECUTING }],
        },
      ]

      const updated = updateActionStatusInMessages(messages, 0, 0, ApprovalActionStatus.PENDING)
      expect(updated[0].actions![0].status).toBe(ApprovalActionStatus.PENDING)
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

      const updated = updateActionStatusInMessages(messages, 0, 1, ApprovalActionStatus.COMMITTED)

      expect(updated[0].actions![0].status).toBeUndefined()
      expect(updated[0].actions![1].status).toBe(ApprovalActionStatus.COMMITTED)
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

      messages = updateActionStatusInMessages(messages, 0, 0, ApprovalActionStatus.EXECUTING)
      messages = updateActionStatusInMessages(messages, 0, 1, ApprovalActionStatus.COMMITTED)
      messages = updateActionStatusInMessages(messages, 0, 0, ApprovalActionStatus.COMMITTED)

      expect(messages[0].actions![0].status).toBe(ApprovalActionStatus.COMMITTED)
      expect(messages[0].actions![1].status).toBe(ApprovalActionStatus.COMMITTED)
    })
  })
})
