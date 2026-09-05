/**
 * Author-labelled plan stubs — one hand-written fixture per GRRM rubric axis.
 * Not live plans; not LLM-authored. Do not merge into storyteller-golden.ts.
 */

export enum AuthorLabelledPlanClass {
  Consequence = 'consequence',
  EmbodiedDialogue = 'embodied-dialogue',
  WithheldTruth = 'withheld-truth',
  SensoryDensity = 'sensory-density',
  LawOfMotion = 'law-of-motion',
  RelationalCost = 'relational-cost',
  WeakDump = 'weak-dump',
}

export interface AuthorLabelledPlanStub {
  readonly id: string
  readonly planClass: AuthorLabelledPlanClass
  readonly seed: number
  readonly goal: string
  readonly conflict: string
  readonly turn: string
  readonly dialogueHook: string
  readonly charactersInvolved: readonly string[]
  readonly authorLabel: string
}

const STUBS: readonly AuthorLabelledPlanStub[] = [
  {
    id: 'alp-consequence-01',
    planClass: AuthorLabelledPlanClass.Consequence,
    seed: 30_001,
    goal: 'Vera wants the vestry key before the bells.',
    conflict: 'Marcus will lose the ward if the key leaves his belt.',
    turn: 'Vera takes the key and the ward debt transfers to her house.',
    dialogueHook: 'She keeps one finger on the iron ring.',
    charactersInvolved: ['Vera', 'Marcus'],
    authorLabel: 'political/relational cost lands on a named other',
  },
  {
    id: 'alp-embodied-01',
    planClass: AuthorLabelledPlanClass.EmbodiedDialogue,
    seed: 30_002,
    goal: 'Vera wants Marcus to admit the blank year.',
    conflict: 'Marcus will not speak while the candle still burns.',
    turn: 'Vera pinches the wick; he talks in the dark.',
    dialogueHook: 'Her hand closes on the candle before he finishes the lie.',
    charactersInvolved: ['Vera', 'Marcus'],
    authorLabel: 'dialogue rides a body, not an explanation',
  },
  {
    id: 'alp-withheld-01',
    planClass: AuthorLabelledPlanClass.WithheldTruth,
    seed: 30_003,
    goal: 'Vera wants the receipt without naming who ordered it.',
    conflict: 'Marcus offers the truth if she will say the name first.',
    turn: 'She takes the receipt and leaves the name unsaid.',
    dialogueHook: 'Your seal. Your hand.',
    charactersInvolved: ['Vera', 'Marcus'],
    authorLabel: 'author-truth stays off the line',
  },
  {
    id: 'alp-sensory-01',
    planClass: AuthorLabelledPlanClass.SensoryDensity,
    seed: 30_004,
    goal: 'Vera wants the wet page before the salt air dries the ink.',
    conflict: 'Rain and iron rust glue the drawer shut.',
    turn: 'She pries it with a cold knife and smells the smoke of the wick.',
    dialogueHook: 'The page is still wet.',
    charactersInvolved: ['Vera'],
    authorLabel: 'sensory density in goal/conflict/turn',
  },
  {
    id: 'alp-motion-01',
    planClass: AuthorLabelledPlanClass.LawOfMotion,
    seed: 30_005,
    goal: 'Vera burns the page she came to steal.',
    conflict: 'Marcus reaches the candle first.',
    turn: 'She lets it burn in his hand; the seal is gone either way.',
    dialogueHook: 'Keep it. It is already ash.',
    charactersInvolved: ['Vera', 'Marcus'],
    authorLabel: 'goal, conflict, and turn are three distinct motions',
  },
  {
    id: 'alp-relational-01',
    planClass: AuthorLabelledPlanClass.RelationalCost,
    seed: 30_006,
    goal: 'Vera wants her brother cleared in the ledger.',
    conflict: 'Clearing him names their mother as the forger.',
    turn: 'She clears him anyway; the house splits.',
    dialogueHook: 'He looks at the door, not at her.',
    charactersInvolved: ['Vera', 'Marcus'],
    authorLabel: 'relational cost is the turn',
  },
  {
    id: 'alp-weak-dump-01',
    planClass: AuthorLabelledPlanClass.WeakDump,
    seed: 30_007,
    goal: 'Talk about the problem',
    conflict: 'Talk about the problem',
    turn: 'Talk about the problem',
    dialogueHook: 'The truth is I am the one who forged the year. Let me explain.',
    charactersInvolved: ['Vera'],
    authorLabel: 'dump + no motion — negative exam row',
  },
]

export const AUTHOR_LABELLED_PLANS_DATASET = {
  name: 'author-labelled-plans',
  description: 'Seven hand-written GRRM plan stubs for Phase 3 judge calibration',
  stubs: STUBS,
} as const

export function sampleAuthorLabelledPlans(
  seed: number,
  count: number = STUBS.length
): AuthorLabelledPlanStub[] {
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

export function authorLabelledPlansContentHash(): string {
  return STUBS.map(stub => `${stub.id}:${stub.goal}:${stub.dialogueHook}`).join('\n')
}
