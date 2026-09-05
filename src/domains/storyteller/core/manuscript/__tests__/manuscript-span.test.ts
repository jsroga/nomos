import { describe, expect, it } from 'vitest'
import { ManuscriptMode } from '@/domains/storyteller/core/types/enums'
import {
  countManuscriptSpans,
  manuscriptSpanAt,
} from '@/domains/storyteller/core/manuscript/manuscript-span'

const SCRIPT = `Unattributed action.

INT. CHAPEL - NIGHT
Vera waits.

INT. STREET - DAY
Marcus runs.`

const NOVEL = `# Chapter 1
She walked the quay.

***

Later that night the bells stopped.`

describe('manuscriptSpanAt', () => {
  it('returns null on an empty page', () => {
    expect(manuscriptSpanAt('', 0, ManuscriptMode.Script)).toBeNull()
    expect(manuscriptSpanAt('   \n  ', 0, ManuscriptMode.Novel)).toBeNull()
  })

  it('treats unattributed script text before the first slugline as its own span', () => {
    const span = manuscriptSpanAt(SCRIPT, 2, ManuscriptMode.Script)
    expect(span).not.toBeNull()
    expect(SCRIPT.slice(span?.start ?? 0, span?.end ?? 0)).toContain('Unattributed action')
    expect(SCRIPT.slice(span?.start ?? 0, span?.end ?? 0)).not.toContain('INT. CHAPEL')
  })

  it('spans slugline to next slugline in Script mode', () => {
    const chapel = SCRIPT.indexOf('INT. CHAPEL')
    const span = manuscriptSpanAt(SCRIPT, chapel + 1, ManuscriptMode.Script)
    expect(span).not.toBeNull()
    const slice = SCRIPT.slice(span?.start ?? 0, span?.end ?? 0)
    expect(slice.startsWith('INT. CHAPEL')).toBe(true)
    expect(slice).toContain('Vera waits')
    expect(slice).not.toContain('INT. STREET')
  })

  it('spans heading or *** in Novel mode', () => {
    const later = NOVEL.indexOf('Later that night')
    const span = manuscriptSpanAt(NOVEL, later, ManuscriptMode.Novel)
    expect(span).not.toBeNull()
    const slice = NOVEL.slice(span?.start ?? 0, span?.end ?? 0)
    expect(slice.startsWith('***')).toBe(true)
    expect(slice).toContain('Later that night')
    expect(slice).not.toContain('# Chapter 1')
  })
})

describe('countManuscriptSpans', () => {
  it('counts the unattributed prefix plus sluglines', () => {
    expect(countManuscriptSpans(SCRIPT, ManuscriptMode.Script)).toBe(3)
    expect(countManuscriptSpans('', ManuscriptMode.Script)).toBe(0)
  })
})
