import { describe, expect, it } from 'vitest'
import { BibleSection } from '@/domains/storyteller/core/types/enums'
import { checkKnowledgeLedgerLeak } from '@/domains/storyteller/core/knowledge-ledger/check-knowledge-ledger'
import { ledgerFactsFromApprovedBeat } from '@/domains/storyteller/core/knowledge-ledger/facts-from-beat'
import {
  CanonAudience,
  emptyBeatDraftCanon,
  formatCanonFor,
} from '@/domains/storyteller/ai/workflows/beat-draft-canon'
import { readFileSync } from 'node:fs'

enum LeakPlant {
  Paraphrase = 'harbour chimes belong to her',
}

describe('knowledge ledger', () => {
  it('catches a paraphrase leak the POV does not know', () => {
    const rows = [
      {
        factText: LeakPlant.Paraphrase,
        authorTruth: true,
        knownBy: [],
      },
    ]
    const hits = checkKnowledgeLedgerLeak(
      `Marcus hears that ${LeakPlant.Paraphrase}.`,
      rows,
      ['Marcus']
    )
    expect(hits).toEqual([LeakPlant.Paraphrase])
  })

  it('keeps author-truth rows out of Author canon and in Continuity', () => {
    const canon = emptyBeatDraftCanon({
      sections: {
        [BibleSection.PLOT_TWISTS]: [{ secret: 'THE_BELLS_ARE_VERA' }],
      },
      knowledgeLedger: [
        {
          factText: LeakPlant.Paraphrase,
          authorTruth: true,
          knownBy: [],
        },
      ],
    })
    const author = formatCanonFor(CanonAudience.Author, canon, ['Vera'])
    const continuity = formatCanonFor(CanonAudience.Continuity, canon, ['Vera'])
    expect(author).not.toContain(LeakPlant.Paraphrase)
    expect(author).not.toContain('THE_BELLS_ARE_VERA')
    expect(continuity).toContain(LeakPlant.Paraphrase)
    expect(continuity).toContain('THE_BELLS_ARE_VERA')
  })

  it('writes story facts known by involved characters after approve', () => {
    const rows = ledgerFactsFromApprovedBeat({
      turn: 'Vera pockets the silver bell',
      charactersInvolved: ['Vera'],
      plotTwistTokens: ['THE_BELLS_ARE_VERA'],
    })
    expect(rows).toEqual([
      {
        factText: 'Vera pockets the silver bell',
        authorTruth: false,
        knownBy: ['Vera'],
      },
      {
        factText: 'THE_BELLS_ARE_VERA',
        authorTruth: true,
        knownBy: [],
      },
    ])
  })

  it('does not drop setupsPayoffs or add a commit_beat tool', () => {
    const schema = readFileSync('src/db/schema-parts/core-tables.ts', 'utf8')
    expect(schema).toContain('setupsPayoffs')
    expect(schema).toContain('afterBeatState')
    const persist = readFileSync(
      'src/domains/storyteller/ai/workflows/beat-draft-default-deps.ts',
      'utf8'
    )
    expect(persist).toContain('writeKnowledgeLedgerRows')
    expect(persist).toContain('writeAfterBeatState')
    expect(persist).toContain('upsertSetupsFromBeat')
    expect(persist).not.toContain('commit_beat')
  })
})
