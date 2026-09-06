import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  episodePremiseText,
  involvedNamesFromCoveringBeats,
  ScriptGhostCopy,
  scriptGhostSystemPrompt,
} from '@/domains/storyteller/core/io/complete-script-ghost-pack'
import { ManuscriptMode } from '@/domains/storyteller/core/types/enums'
import { BeatboardPremiseFieldKey } from '@/domains/storyteller/core/constants/beatboard-premise-validation'
import { RunTraceEventType } from '@/shared/agent-kernel/run-trace'

enum CompleteGhostSource {
  Path = 'src/domains/storyteller/core/io/complete-script-ghost.ts',
  Pack = 'src/domains/storyteller/core/io/complete-script-ghost-pack.ts',
}

enum GhostForbiddenToken {
  RoleDispatch = 'RoleDispatch',
  CritiqueContinuity = 'critiqueContinuity',
  CritiqueProse = 'critiqueProse',
  CritiqueStakes = 'critiqueStakes',
  Humanizer = 'humanizeBeatDraft',
}

describe('completeScriptGhost packing helpers', () => {
  it('uses a script system line that names the format and forbids critiques', () => {
    const system = scriptGhostSystemPrompt(ManuscriptMode.Script)
    expect(system).toContain(ScriptGhostCopy.System)
    expect(system).toContain(`${ScriptGhostCopy.FormatLinePrefix}${ManuscriptMode.Script}`)
    expect(system).not.toContain(`${ScriptGhostCopy.FormatLinePrefix}${ManuscriptMode.Novel}`)
    expect(system.toLowerCase()).toContain('do not run critiques')
  })

  it('uses a novel system line distinct from script', () => {
    const system = scriptGhostSystemPrompt(ManuscriptMode.Novel)
    expect(system).toContain(`${ScriptGhostCopy.FormatLinePrefix}${ManuscriptMode.Novel}`)
    expect(system).not.toContain(`${ScriptGhostCopy.FormatLinePrefix}${ManuscriptMode.Script}`)
    expect(system).toContain(ScriptGhostCopy.System)
  })

  it('does not import critic or Humanizer walls in the complete-script-ghost source', () => {
    for (const path of [CompleteGhostSource.Path, CompleteGhostSource.Pack]) {
      const source = readFileSync(path, 'utf8')
      expect(source).not.toContain(GhostForbiddenToken.RoleDispatch)
      expect(source).not.toContain(RunTraceEventType.RoleDispatch)
      expect(source).not.toContain(GhostForbiddenToken.CritiqueContinuity)
      expect(source).not.toContain(GhostForbiddenToken.CritiqueProse)
      expect(source).not.toContain(GhostForbiddenToken.CritiqueStakes)
      expect(source).not.toContain(GhostForbiddenToken.Humanizer)
    }
    expect(readFileSync(CompleteGhostSource.Path, 'utf8')).toContain('packScriptGhostContext')
  })

  it('collects unique involved names from covering beats', () => {
    expect(
      involvedNamesFromCoveringBeats([
        {
          id: 'beat-1',
          sequence: 1,
          content: 'Vera waits.',
          causalDependencies: [],
          beatType: null,
          charactersInvolved: ['Vera', 'vera', 'Marcus'],
        },
        {
          id: 'beat-2',
          sequence: 2,
          content: null,
          causalDependencies: [],
          beatType: null,
        },
      ])
    ).toEqual(['Vera', 'Marcus'])
  })

  it('prefers episode premise column then plan logline', () => {
    expect(episodePremiseText('Vera hunts the bells.', null)).toBe('Vera hunts the bells.')
    expect(
      episodePremiseText(null, { [BeatboardPremiseFieldKey.Logline]: 'The chapel keeps the bells.' })
    ).toBe('The chapel keeps the bells.')
    expect(episodePremiseText('  ', {})).toBe('')
  })
})
