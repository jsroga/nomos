import { describe, it, expect } from 'vitest'
import {
  parseCliArgs,
  readSuspension,
  resolvePlanBody,
  intentToCliEvent,
  PLAN_APPROVED,
  PLAN_REJECTED,
  type CliEnv,
} from '../storyteller-controller-wire'

const EMPTY_ENV: CliEnv = {}

describe('parseCliArgs', () => {
  it('requires a projectId', () => {
    expect(parseCliArgs([], EMPTY_ENV)).toContain('--projectId')
  })

  it('falls back to STORYTELLER_* env vars and defaults the userId', () => {
    const parsed = parseCliArgs([], { STORYTELLER_PROJECT_ID: 'p1', STORYTELLER_EPISODE_ID: 'e1' })
    expect(parsed).toMatchObject({ projectId: 'p1', episodeId: 'e1', userId: 'cli-user', json: false })
  })

  it('parses value flags, switches, and lets argv win over env', () => {
    const parsed = parseCliArgs(
      ['--projectId', 'p2', '--message', 'hello there', '--userId', 'u9', '--json', '--approve'],
      { STORYTELLER_PROJECT_ID: 'from-env' }
    )
    expect(parsed).toMatchObject({
      projectId: 'p2',
      message: 'hello there',
      userId: 'u9',
      json: true,
      decision: PLAN_APPROVED,
    })
  })

  it('carries reject feedback', () => {
    const parsed = parseCliArgs(['--projectId', 'p', '--reject', '--feedback', 'too broad'], EMPTY_ENV)
    expect(parsed).toMatchObject({ decision: PLAN_REJECTED, feedback: 'too broad' })
  })

  it('rejects --approve together with --reject', () => {
    expect(parseCliArgs(['--projectId', 'p', '--approve', '--reject'], EMPTY_ENV)).toContain(
      'mutually exclusive'
    )
  })

  it('returns null for --help', () => {
    expect(parseCliArgs(['--help'], EMPTY_ENV)).toBeNull()
  })
})

describe('readSuspension / resolvePlanBody', () => {
  it('reads the submit_plan suspend payload', () => {
    const pending = readSuspension({
      toolCallId: 'call-1',
      toolName: 'submit_plan',
      suspendPayload: { path: '.mastracode/plans/x.md', title: 'Rename act 2', plan: 'step one' },
    })
    expect(pending).toEqual({
      toolCallId: 'call-1',
      toolName: 'submit_plan',
      planPath: '.mastracode/plans/x.md',
      planBody: '# Rename act 2\n\nstep one',
    })
    expect(resolvePlanBody(pending, process.cwd())).toBe('# Rename act 2\n\nstep one')
  })

  it('tolerates a non-object payload', () => {
    expect(readSuspension({ toolCallId: 'c', toolName: 'ask_user', suspendPayload: null })).toEqual({
      toolCallId: 'c',
      toolName: 'ask_user',
    })
  })

  it('explains a path with no plan file on disk', () => {
    const body = resolvePlanBody(
      { toolCallId: 'c', toolName: 'submit_plan', planPath: 'nope/missing-plan.md' },
      process.cwd()
    )
    expect(body).toContain('nope/missing-plan.md')
    expect(body).toContain('no workspace')
  })
})

describe('intentToCliEvent', () => {
  it('drops the nameless tool-start status intent', () => {
    expect(intentToCliEvent({ kind: 'status' })).toBeNull()
  })

  it('maps mode/info intents to notes and errors to messages', () => {
    expect(intentToCliEvent({ kind: 'info', message: 'Mode: build' })).toEqual({
      type: 'note',
      message: 'Mode: build',
    })
    expect(intentToCliEvent({ kind: 'error', error: new Error('boom') })).toEqual({
      type: 'error',
      message: 'boom',
    })
  })
})
