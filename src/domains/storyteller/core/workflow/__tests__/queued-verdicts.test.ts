import { describe, expect, it } from 'vitest'
import { selectQueuedVerdicts } from '../queued-verdicts'
import { MastraWorkflowStatus } from '@/shared/data/constants/protocol'
import { readFileSync } from 'node:fs'
import { FeatureFlag, isFeatureEnabled } from '@/shared/data/constants/feature-flags'

describe('queued editorial verdicts', () => {
  it('keeps only suspended runs for the project', () => {
    const queued = selectQueuedVerdicts(
      [
        { runId: 'a', status: MastraWorkflowStatus.Suspended, projectId: 'p1' },
        { runId: 'b', status: 'success', projectId: 'p1' },
        { runId: 'c', status: MastraWorkflowStatus.Suspended, projectId: 'p2' },
      ],
      'p1'
    )
    expect(queued).toEqual([{ runId: 'a' }])
  })

  it('keeps autonomy off by default and omits commit_beat', () => {
    Reflect.deleteProperty(process.env, FeatureFlag.StorytellerAutonomous)
    expect(isFeatureEnabled(FeatureFlag.StorytellerAutonomous)).toBe(false)
    const config = readFileSync(
      'src/mastra/agents/storyteller-autonomous-author/config.ts',
      'utf8'
    )
    expect(config).not.toContain('commit_beat')
    expect(config).toContain('goal: autonomousGoal')
  })
})
