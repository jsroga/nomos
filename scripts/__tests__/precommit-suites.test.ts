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

  it('does not select commit e2e for 2d-canvas (critical canvas runs on pre-push)', () => {
    const suites = selectPrecommitSuites(['src/domains/2d-canvas/ui/Canvas.tsx'])
    expect(suites).toEqual([])
    expect(needsProdServer(suites)).toBe(false)
  })

  it('selects stub e2e for workspace overlay, not 2d-canvas', () => {
    const suites = selectPrecommitSuites([
      'src/shared/chat/ui/WorkspaceChatOverlay/WorkspaceChatOverlay.tsx',
    ])
    expect(suites).toEqual([PrecommitSuite.E2eStubs])
    expect(needsProdServer(suites)).toBe(true)
  })

  it('selects smoke for the production e2e bypass gate', () => {
    expect(selectPrecommitSuites(['src/shared/auth/utils/e2e-bypass.ts'])).toEqual([
      PrecommitSuite.E2eSmoke,
    ])
  })

  it('selects smoke and eval for storyteller domain AI, not live Playwright', () => {
    const suites = selectPrecommitSuites([
      'src/domains/storyteller/ai/agents/StorytellerAgent/storyteller-agent.ts',
    ])
    expect(suites.sort()).toEqual(
      [PrecommitSuite.EvalFreshness, PrecommitSuite.E2eSmoke].sort(),
    )
  })

  it('selects nothing for workspace chrome (critical Storyteller is pre-push)', () => {
    expect(selectPrecommitSuites(['src/app/(workspace)/[projectId]/storyteller/page.tsx'])).toEqual(
      [],
    )
  })

  it('unions suites across a mixed commit', () => {
    const suites = selectPrecommitSuites([
      'src/shared/chat/ui/WorkspaceChatOverlay/index.ts',
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

  it('treats Playwright runner infra as commit smoke and overlay stub', () => {
    const suites = selectPrecommitSuites(['playwright.config.ts'])
    expect(suites.sort()).toEqual([PrecommitSuite.E2eStubs, PrecommitSuite.E2eSmoke].sort())
  })

  it('does not treat loop-creator AI as Storyteller e2e', () => {
    expect(selectPrecommitSuites(['src/domains/loop-creator/ai/agents/balance-analyst.ts'])).toEqual(
      [PrecommitSuite.EvalFreshness],
    )
  })
})

describe('e2e cadence scripts', () => {
  it('keeps overlay stub on commit, critical Storyteller+canvas on push, full folder nightly', () => {
    const pkg = readFileSync(new URL('../../package.json', import.meta.url), 'utf8')
    expect(pkg).toContain(
      '"test:e2e:stubs": "playwright test e2e/scenarios/workspace-chat-overlay.spec.ts"',
    )
    expect(pkg).toContain(
      '"test:e2e:critical": "playwright test e2e/scenarios/storyteller.spec.ts e2e/scenarios/world-canvas.spec.ts"',
    )
    expect(pkg).toContain('"test:e2e:nightly": "playwright test"')
    expect(pkg).not.toContain('test:e2e:live-storyteller')
  })

  it('runs critical Playwright from pre-push, not a skip log', () => {
    const prePush = readFileSync(new URL('../pre-push.mjs', import.meta.url), 'utf8')
    expect(prePush).toContain('test:e2e:critical')
    expect(prePush).not.toContain('skipped live suites')
  })

  it('runs full unit tests on the Vercel deploy build command', () => {
    const vercel = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'))
    expect(vercel.buildCommand).toBe('npm run test:unit && npm run build')
  })
})
