import { describe, expect, it } from 'vitest'
import {
  mapLoopStreamEventToReasoningDelta,
  mapLoopStreamEventToTextDelta,
} from '../loop-assistant-stream-map'
import { AssistantReasoningPrefix } from '@/shared/chat/core/utils/assistant-thread-ui'
import {
  LoopOrchestratorEventType,
  LoopOrchestratorNodeStatus,
} from '@/domains/loop-creator/constants/loop-orchestrator'
import { LoopAgentWorkingCopy } from '@/domains/loop-creator/constants/loop-orchestrator'
import type { StreamEvent } from '@/domains/loop-creator/core/graph/stream-event'

const NOW = 1

describe('mapLoopStreamEventToReasoningDelta', () => {
  it('maps working Node to a friendly activity line', () => {
    const event: StreamEvent = {
      type: LoopOrchestratorEventType.Node,
      node: 'mechanics_designer',
      agent: 'Mechanics Designer',
      status: LoopOrchestratorNodeStatus.Working,
      content: LoopAgentWorkingCopy.MechanicsDesigner,
      timestamp: NOW,
    }
    expect(mapLoopStreamEventToReasoningDelta(event)).toBe(
      `${AssistantReasoningPrefix.Activity}${LoopAgentWorkingCopy.MechanicsDesigner}\n`,
    )
  })

  it('ignores done Node so peek is not JSON', () => {
    const event: StreamEvent = {
      type: LoopOrchestratorEventType.Node,
      node: 'mechanics_designer',
      status: LoopOrchestratorNodeStatus.Done,
      timestamp: NOW,
    }
    expect(mapLoopStreamEventToReasoningDelta(event)).toBeNull()
  })

  it('maps Log lines for the Logs panel', () => {
    const event: StreamEvent = {
      type: LoopOrchestratorEventType.Log,
      content: '[MechanicsDesigner] Calling LLM...',
      timestamp: NOW,
    }
    expect(mapLoopStreamEventToReasoningDelta(event)).toBe(
      '[MechanicsDesigner] Calling LLM...\n',
    )
  })
})

describe('mapLoopStreamEventToTextDelta', () => {
  it('maps specialist Message to text', () => {
    const event: StreamEvent = {
      type: LoopOrchestratorEventType.Message,
      message: {
        type: 'ai',
        content: 'Created 3 mechanics.',
        sender: 'mechanics_designer',
        name: 'mechanics_designer',
      },
      timestamp: NOW,
    }
    expect(mapLoopStreamEventToTextDelta(event)).toBe('Created 3 mechanics.\n\n')
  })
})
