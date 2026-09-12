import { describe, expect, it } from 'vitest'
import { LoopAgentNode } from '@/domains/loop-creator/constants/agent-nodes'
import {
  LoopAgentWorkingCopy,
  LoopOrchestratorEventType,
  LoopOrchestratorNodeStatus,
} from '@/domains/loop-creator/constants/loop-orchestrator'
import type { StreamEvent } from '../stream-event'
import { runWithWorkingEvent } from '../loop-crew-progress'

const DELAY_MS = 20

describe('runWithWorkingEvent', () => {
  it('emits working before the specialist work resolves', async () => {
    const events: StreamEvent[] = []
    const firstWorking = () =>
      events.find(
        event =>
          event.type === LoopOrchestratorEventType.Node &&
          event.status === LoopOrchestratorNodeStatus.Working,
      )

    let sawWorkingBeforeWork = false
    const result = await runWithWorkingEvent(
      LoopAgentNode.MechanicsDesigner,
      event => {
        events.push(event)
      },
      async () => {
        sawWorkingBeforeWork = events.some(
          event =>
            event.type === LoopOrchestratorEventType.Node &&
            event.status === LoopOrchestratorNodeStatus.Working,
        )
        await new Promise(resolve => {
          setTimeout(resolve, DELAY_MS)
        })
        return 'done'
      },
    )

    expect(sawWorkingBeforeWork).toBe(true)
    expect(firstWorking()?.content).toBe(LoopAgentWorkingCopy.MechanicsDesigner)
    expect(result).toBe('done')
    expect(events.some(event => event.type === LoopOrchestratorEventType.Log)).toBe(true)
  })
})
