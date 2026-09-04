/**
 * Author-labelled beat stubs — one hand-written fixture per Action 20 class.
 * Not live beats; not LLM-authored. Do not merge into storyteller-golden.ts.
 */

export enum AuthorLabelledBeatClass {
  DialogueHeavy = 'dialogue-heavy',
  Reveal = 'reveal',
  FirstAppearance = 'first-appearance',
  Action = 'action',
  ContinuityTrap = 'continuity-trap',
  DeceivedPov = 'deceived-pov',
  DelayedCost = 'delayed-cost',
}

export interface AuthorLabelledBeatStub {
  readonly id: string
  readonly beatClass: AuthorLabelledBeatClass
  readonly seed: number
  readonly brief: string
  readonly canonNote: string
  readonly draftStub: string
  /** Author label — what a human would mark on this exam row. */
  readonly authorLabel: string
}

const STUBS: readonly AuthorLabelledBeatStub[] = [
  {
    id: 'alb-dialogue-heavy-01',
    beatClass: AuthorLabelledBeatClass.DialogueHeavy,
    seed: 20_001,
    brief: 'Vera and Marcus argue over the ledger without naming the crime.',
    canonNote: 'Marcus knows the forgery; Vera suspects but lacks proof.',
    draftStub:
      'INT. CHAPEL — NIGHT\n\nVERA\n  You signed for it.\n\nMARCUS\n  I signed for ink. Not for what you think.',
    authorLabel: 'dialogue carries subtext; no exposition dump',
  },
  {
    id: 'alb-reveal-01',
    beatClass: AuthorLabelledBeatClass.Reveal,
    seed: 20_002,
    brief: 'The confession implicates Vera herself.',
    canonNote: 'Author-truth: Vera ordered the blank year. She must not say so yet.',
    draftStub:
      'INT. CHAPEL — NIGHT\n\nMarcus slides a receipt across the rail.\n\nMARCUS\n  Your seal. Your hand.',
    authorLabel: 'reveal lands through prop + line; no narrator summary',
  },
  {
    id: 'alb-first-appearance-01',
    beatClass: AuthorLabelledBeatClass.FirstAppearance,
    seed: 20_003,
    brief: 'Introduce the archivist without a résumé speech.',
    canonNote: 'Archivist is new on screen; ward already exists in bible.',
    draftStub:
      'INT. ARCHIVE — DAY\n\nA woman stamps a blank year into a wet page, then checks the door twice.',
    authorLabel: 'first appearance via habit, not biography',
  },
  {
    id: 'alb-action-01',
    beatClass: AuthorLabelledBeatClass.Action,
    seed: 20_004,
    brief: 'Vera burns the page she came to steal.',
    canonNote: 'Candle and vespers countdown already planted.',
    draftStub:
      'INT. CHAPEL — NIGHT\n\nVera holds the page to the candle. Flame takes the seal first.',
    authorLabel: 'observable actionTaken + irreversible consequence',
  },
  {
    id: 'alb-continuity-trap-01',
    beatClass: AuthorLabelledBeatClass.ContinuityTrap,
    seed: 20_005,
    brief: 'Beat must not resurrect a locked-away ledger already ash.',
    canonNote: 'Prior beat: ledger page burned. Continuity trap = intact ledger returns.',
    draftStub:
      'INT. CHAPEL — LATER\n\nMarcus opens an empty drawer where the page used to live.',
    authorLabel: 'honours burned page; no intact-ledger reset',
  },
  {
    id: 'alb-deceived-pov-01',
    beatClass: AuthorLabelledBeatClass.DeceivedPov,
    seed: 20_006,
    brief: 'POV is Vera; she must not know Marcus already confessed off-screen.',
    canonNote: 'Author-truth: Marcus confessed to the council. Vera is deceived.',
    draftStub:
      'INT. WARD HALL — DAY\n\nVera watches Marcus smile at the council doors and assumes he won a delay.',
    authorLabel: 'deceived POV; no leak of off-screen confession',
  },
  {
    id: 'alb-delayed-cost-01',
    beatClass: AuthorLabelledBeatClass.DelayedCost,
    seed: 20_007,
    brief: 'A win now that invoices later.',
    canonNote: 'Free win forbidden; cost must be delayed, not free.',
    draftStub:
      'INT. ARCHIVE — NIGHT\n\nVera stamps the year clean. In her pocket: a second seal she must return by dawn.',
    authorLabel: 'delayed cost planted; not a free win',
  },
]

export const AUTHOR_LABELLED_BEATS_DATASET = {
  name: 'author-labelled-beats',
  description: 'Seven hand-written Action 20 class stubs for Phase 2 golden start',
  stubs: STUBS,
} as const

/** Seeded sample — same seed and pool → same stub ids in order. */
export function sampleAuthorLabelledBeats(
  seed: number,
  count: number = STUBS.length
): AuthorLabelledBeatStub[] {
  const pool = [...STUBS]
  let state = seed >>> 0
  const next = () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0
    return state
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = next() % (i + 1)
    const left = pool[i]
    const right = pool[j]
    if (left === undefined || right === undefined) continue
    pool[i] = right
    pool[j] = left
  }
  return pool.slice(0, Math.min(count, pool.length))
}

export function authorLabelledBeatsContentHash(): string {
  return STUBS.map(stub => `${stub.id}:${stub.draftStub}`).join('\n')
}
