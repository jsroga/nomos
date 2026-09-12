import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { EVAL_WATCHED_PATHS } from '../../evals/input-hash.mjs'
import {
  PrecommitSuite,
  needsProdServer,
  selectPrecommitSuites,
} from '../precommit-suites.mjs'

describe('selectPrecommitSuites', () => {
  it('selects nothing for docs, lockfile, or README', () => {
    expect(
      selectPrecommitSuites(['README.md', 'docs/DEVELOPMENT.md', 'package-lock.json']),
    ).toEqual([])
  })

  it('selects eval freshness for every eval-watched prefix', () => {
    for (const prefix of EVAL_WATCHED_PATHS) {
      const file = `${prefix}/example.ts`
      expect(selectPrecommitSuites([file])).toContain(PrecommitSuite.EvalFreshness)
    }
    expect(selectPrecommitSuites(['evals/results/latest.json'])).toEqual([
      PrecommitSuite.EvalFreshness,
    ])
  })

  it('selects stub e2e for 2d-canvas and overlay, not live Storyteller', () => {
    const suites = selectPrecommitSuites(['src/domains/2d-canvas/ui/Canvas.tsx'])
    expect(suites).toEqual([PrecommitSuite.E2eStubs])
    expect(needsProdServer(suites)).toBe(true)
  })

  it('selects smoke for the production e2e bypass gate', () => {
    expect(selectPrecommitSuites(['src/shared/auth/utils/e2e-bypass.ts'])).toEqual([
      PrecommitSuite.E2eSmoke,
    ])
  })

  it('selects live Storyteller, smoke, and eval for storyteller domain AI', () => {
    const suites = selectPrecommitSuites([
      'src/domains/storyteller/ai/agents/StorytellerAgent/storyteller-agent.ts',
    ])
    expect(suites.sort()).toEqual(
      [
        PrecommitSuite.EvalFreshness,
        PrecommitSuite.E2eSmoke,
        PrecommitSuite.E2eLiveStoryteller,
      ].sort(),
    )
  })

  it('selects live Storyteller for workspace chrome without eval', () => {
    expect(selectPrecommitSuites(['src/app/(workspace)/[projectId]/storyteller/page.tsx'])).toEqual([
      PrecommitSuite.E2eLiveStoryteller,
    ])
  })

  it('unions suites across a mixed commit', () => {
    const suites = selectPrecommitSuites([
      'src/domains/2d-canvas/index.ts',
      'src/shared/ai/gateway/output-budget.ts',
      'evals/constants/thresholds.ts',
    ])
    expect(suites.sort()).toEqual(
      [
        PrecommitSuite.E2eStubs,
        PrecommitSuite.E2eSmoke,
        PrecommitSuite.EvalFreshness,
      ].sort(),
    )
  })

  it('treats Playwright runner infra as all e2e suites', () => {
    const suites = selectPrecommitSuites(['playwright.config.ts'])
    expect(suites.sort()).toEqual(
      [
        PrecommitSuite.E2eStubs,
        PrecommitSuite.E2eSmoke,
        PrecommitSuite.E2eLiveStoryteller,
      ].sort(),
    )
  })

  it('does not treat loop-creator AI as Storyteller e2e', () => {
    expect(selectPrecommitSuites(['src/domains/loop-creator/ai/agents/balance-analyst.ts'])).toEqual(
      [PrecommitSuite.EvalFreshness],
    )
  })
})

describe('precommit live vs nightly scripts', () => {
  it('keeps whole-flow Storyteller on nightly, not the live precommit script', () => {
    const pkg = readFileSync(new URL('../../package.json', import.meta.url), 'utf8')
    expect(pkg).toContain(
      '"test:e2e:live-storyteller": "playwright test e2e/scenarios/storyteller-character-fields.spec.ts"',
    )
    expect(pkg).toContain('"test:e2e:nightly": "playwright test"')
  })
})
