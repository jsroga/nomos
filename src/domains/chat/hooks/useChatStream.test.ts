/**
 * Unit tests for useChatStream hook - Action Status Management
 *
 * Run with: npx tsx src/domains/chat/hooks/useChatStream.test.ts
 */

import { Message, ActionStatus, AgentAction } from '../types'

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

// Test utilities
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ ASSERTION FAILED: ${message}`)
  }
  console.log(`  ✅ ${message}`)
}

function describe(name: string, fn: () => void) {
  console.log(`\n📦 ${name}`)
  fn()
}

function it(name: string, fn: () => void) {
  try {
    fn()
    console.log(`  ✅ ${name}`)
  } catch (error: any) {
    console.error(`  ❌ ${name}`)
    console.error(`     ${error.message}`)
    throw error
  }
}

// Tests
async function runTests() {
  console.log('\n🧪 useChatStream Unit Tests - Action Status Management\n')
  console.log('='.repeat(60))

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

      assert(updated[1].actions![0].status === 'executing', 'First action should be executing')
      assert(updated[1].actions![1].status === undefined, 'Second action should remain unchanged')
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

      assert(messages[0].actions![0].status === undefined, 'Original should be unchanged')
      assert(updated[0].actions![0].status === 'committed', 'Updated should have new status')
    })

    it('should handle non-existent message index gracefully', () => {
      const messages: Message[] = [
        { content: 'Only one', type: 'ai', actions: [{ type: 'TEST', payload: {} }] },
      ]

      const updated = updateActionStatusInMessages(messages, 99, 0, 'committed')

      assert(updated.length === 1, 'Should return same length')
      assert(updated[0].actions![0].status === undefined, 'Should not change anything')
    })

    it('should handle message without actions', () => {
      const messages: Message[] = [{ content: 'No actions here', type: 'ai' }]

      const updated = updateActionStatusInMessages(messages, 0, 0, 'committed')

      assert(updated[0].actions === undefined, 'Should not add actions')
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

      assert(updated[0].sender === 'PremiseArchitect', 'Sender preserved')
      assert(updated[0].confidence === 0.9, 'Confidence preserved')
      assert(updated[0].thinking === 'Some reasoning', 'Thinking preserved')
      assert(updated[0].actions![0].payload.data === 'important', 'Action payload preserved')
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
      assert(messages[0].actions![0].status === undefined, 'Initial status is undefined (pending)')

      // Transition to executing
      let updated = updateActionStatusInMessages(messages, 0, 0, 'executing')
      assert(updated[0].actions![0].status === 'executing', 'Status is executing')

      // Transition to committed
      updated = updateActionStatusInMessages(updated, 0, 0, 'committed')
      assert(updated[0].actions![0].status === 'committed', 'Status is committed')
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
      assert(updated[0].actions![0].status === 'rejected', 'Status is rejected')
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
      assert(updated[0].actions![0].status === 'pending', 'Status rolled back to pending')
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

      assert(updated[0].actions![0].status === undefined, 'First action unchanged')
      assert(updated[0].actions![1].status === 'committed', 'Second action committed')
      assert(updated[0].actions![2].status === undefined, 'Third action unchanged')
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

      assert(messages[0].actions![0].status === 'committed', 'First action committed')
      assert(messages[0].actions![1].status === 'committed', 'Second action committed')
    })
  })

  console.log('\n' + '='.repeat(60))
  console.log('✅ All tests passed!\n')
}

// Run tests
runTests().catch(error => {
  console.error('\n❌ Tests failed:', error.message)
  process.exit(1)
})
