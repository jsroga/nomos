import { describe, it, expect, afterEach } from 'vitest'
import {
  getAutonomousGoalConfig,
  isStorytellerAutonomousEnabled,
  STORYTELLER_AUTONOMOUS_ENV,
  STORYTELLER_AUTONOMOUS_MAX_RUNS,
  AUTONOMOUS_AUTHOR_ID,
} from '../autonomous-author-agent'

describe('autonomous author agent (goals + durable)', () => {
  it('has a stable id and a goal with a critic judge + bounded budget', () => {
    expect(AUTONOMOUS_AUTHOR_ID).toBe('storyteller-autonomous-author')
    const goal = getAutonomousGoalConfig()
    // Judge is a resolver function (reads the critic-role model at runtime).
    expect(typeof goal.judge).toBe('function')
    expect(goal.maxRuns).toBe(STORYTELLER_AUTONOMOUS_MAX_RUNS)
    expect(goal.prompt).toBeTruthy()
  })

  describe('flag', () => {
    const prev = process.env[STORYTELLER_AUTONOMOUS_ENV]
    afterEach(() => {
      if (prev === undefined) Reflect.deleteProperty(process.env, STORYTELLER_AUTONOMOUS_ENV)
      else process.env[STORYTELLER_AUTONOMOUS_ENV] = prev
    })

    it('is off unless FF_STORYTELLER_AUTONOMOUS=true', () => {
      Reflect.deleteProperty(process.env, STORYTELLER_AUTONOMOUS_ENV)
      expect(isStorytellerAutonomousEnabled()).toBe(false)
      process.env[STORYTELLER_AUTONOMOUS_ENV] = '1'
      expect(isStorytellerAutonomousEnabled()).toBe(false)
      process.env[STORYTELLER_AUTONOMOUS_ENV] = 'true'
      expect(isStorytellerAutonomousEnabled()).toBe(true)
    })
  })
})
