import { describe, expect, it } from 'vitest'
import {
  manuscriptVerdictOutputFromResume,
  persistManuscriptSectionOnVerdict,
  spliceManuscriptSection,
} from '@/domains/storyteller/core/manuscript/splice-manuscript-section'

const SCRIPT = `INT. A - DAY
Alpha.

INT. B - DAY
Bravo.`

describe('spliceManuscriptSection', () => {
  it('replaces the span for regenerate and appends when span is null', () => {
    const chapel = SCRIPT.indexOf('INT. B')
    const replaced = spliceManuscriptSection(
      SCRIPT,
      { start: chapel, end: SCRIPT.length },
      'INT. B - NIGHT\nRewritten.'
    )
    expect(replaced).toContain('INT. A - DAY')
    expect(replaced).toContain('INT. B - NIGHT')
    expect(replaced).not.toContain('Bravo.')

    const appended = spliceManuscriptSection(SCRIPT, null, 'INT. C - DAY\nCharlie.')
    expect(appended.startsWith(SCRIPT.trimEnd())).toBe(true)
    expect(appended).toContain('INT. C - DAY')
  })
})

describe('persistManuscriptSectionOnVerdict', () => {
  it('writes nothing on kill or unsaved claim-check fail', () => {
    expect(
      persistManuscriptSectionOnVerdict({
        killed: true,
        saved: false,
        scriptContent: SCRIPT,
        span: null,
        finalDraft: 'INT. C - DAY',
      })
    ).toBeNull()
    expect(
      persistManuscriptSectionOnVerdict({
        killed: false,
        saved: false,
        scriptContent: SCRIPT,
        span: null,
        finalDraft: 'INT. C - DAY',
      })
    ).toBeNull()
  })

  it('splices Humanizer finalDraft when the verdict saved', () => {
    const next = persistManuscriptSectionOnVerdict({
      killed: false,
      saved: true,
      scriptContent: '',
      span: null,
      finalDraft: 'INT. A - DAY\nVera waits.',
    })
    expect(next).toBe('INT. A - DAY\nVera waits.')
  })

  it('reads finalDraft from the resume payload', () => {
    const parsed = manuscriptVerdictOutputFromResume({
      output: { finalDraft: 'INT. A - DAY', killed: false, saved: true },
    })
    expect(parsed?.finalDraft).toBe('INT. A - DAY')
    expect(parsed?.saved).toBe(true)
  })
})
