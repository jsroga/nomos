import { describe, expect, it } from 'vitest'
import { queuedVerdictsListVisible, selectQueuedVerdicts } from '../queued-verdicts'
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

  it('hides the overlay chrome when nothing is waiting', () => {
    expect(queuedVerdictsListVisible([])).toBe(false)
    expect(queuedVerdictsListVisible(['run-1'])).toBe(true)
    const src = readFileSync(
      'src/domains/storyteller/ui/QueuedVerdicts/QueuedVerdictsList.tsx',
      'utf8',
    )
    expect(src).toContain('queuedVerdictsListVisible(runIds)')
    expect(src).toContain('return null')
    expect(src).not.toContain('No queued verdicts')
    expect(src).not.toContain('Queued editorial verdicts')
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
