/**
 * Live writer-quality dataset. Inputs only — no frozen referenceOutput.
 * Golden fixtures stay in storyteller-golden.ts.
 */

import { HourLoopScorerId, hourLoopScorersForItem } from '@/shared/agent-kernel/scorers/hour-loop-default-scorers'
import { beatDraftBrief, loadWorldFixture } from '../fixtures/load-world'

export const LIVE_QUALITY_DATASET_NAME = 'storyteller-live-quality'
export const LIVE_QUALITY_VERSION = 1

const AETERNUM_WORLD = 'aeternum'

const AETERNUM_CANON =
  'The Stillness locked every living body at its age. Only another hand can end a life. The Law of Equivalence prices every death. Killers inherit Death Debts. The Silence of the Dying lasts one breath within ten paces. Sera Voss is a Death Warden. Cael Marchand is High Warden and controls Lethe mining.'

const AETERNUM_FACTS = [
  'Sera Voss is a Death Warden and still wears her Tallybone.',
  'Cael Marchand is High Warden and has not confiscated the unmarked tenement body.',
  'The Ashen Compass went dark over a body with no Silence of the Dying.',
  'The Census of the Damned counted more living people than sanctioned deaths.',
]

export interface StorytellerLiveQualityExample {
  id: string
  version: number
  input: {
    message: string
    facts?: string[]
    canon?: string
    persona?: string
  }
  metadata: {
    scorers: string[]
    underpowered?: boolean
    source: string
  }
}

const EXTRA_BRIEFS: Array<{
  id: string
  message: string
  facts?: string[]
  canon?: string
  underpowered?: boolean
}> = [
  {
    id: 'live-census-lie',
    message:
      'Write the beat where Sera Voss forces Marchand to admit the Census of the Damned undercounts sanctioned deaths. Someone must lose control of the ledger by the last line.',
    facts: AETERNUM_FACTS,
    canon: AETERNUM_CANON,
  },
  {
    id: 'live-death-debt-child',
    message:
      'Write the beat where Sera inherits a Death Debt from a child locked at seven. She must take an action that changes who carries the memory, not merely feel it.',
    facts: AETERNUM_FACTS,
    canon: AETERNUM_CANON,
  },
  {
    id: 'live-silence-as-cover',
    message:
      'Write a violent beat in which a killer times The Silence of the Dying so a second crime happens in the breath of quiet. The compass or the candle must move.',
    facts: AETERNUM_FACTS,
    canon: AETERNUM_CANON,
  },
  {
    id: 'live-tallybone-audit',
    message:
      'Write the procedural beat where Sera proves a Tallybone entry is forged. Marchand must either confiscate the bone or be seen refusing.',
    facts: AETERNUM_FACTS,
    canon: AETERNUM_CANON,
  },
  {
    id: 'live-lethe-queue',
    message:
      'Write the intimate beat at a Lethe ration queue after Marchand restricted supply. The supplier names a price that costs Sera a concrete ally.',
    facts: AETERNUM_FACTS,
    canon: AETERNUM_CANON,
    underpowered: true,
  },
  {
    id: 'live-age-lock-warden',
    message:
      'Write the beat where a Warden frozen at age seven outranks Sera in the chamber. Apparent age must not decide the outcome; a document or warrant must.',
    facts: AETERNUM_FACTS,
    canon: AETERNUM_CANON,
    underpowered: true,
  },
]

function withScorers(item: {
  id: string
  message: string
  facts?: string[]
  canon?: string
  underpowered?: boolean
  source: string
}): StorytellerLiveQualityExample {
  return {
    id: item.id,
    version: LIVE_QUALITY_VERSION,
    input: {
      message: item.message,
      ...(item.facts ? { facts: item.facts } : {}),
      ...(item.canon ? { canon: item.canon } : {}),
    },
    metadata: {
      scorers: hourLoopScorersForItem({ facts: item.facts, canon: item.canon }),
      ...(item.underpowered ? { underpowered: true } : {}),
      source: item.source,
    },
  }
}

function seedFromAeternum(): StorytellerLiveQualityExample[] {
  const world = loadWorldFixture(AETERNUM_WORLD)
  return world.prompts.map(prompt =>
    withScorers({
      id: `live-${prompt.id}`,
      message: beatDraftBrief(prompt),
      facts: AETERNUM_FACTS,
      canon: AETERNUM_CANON,
      source: `aeternum/prompts/${prompt.id}`,
    }),
  )
}

export const STORYTELLER_LIVE_QUALITY_EXAMPLES: StorytellerLiveQualityExample[] = [
  ...seedFromAeternum(),
  ...EXTRA_BRIEFS.map(brief =>
    withScorers({
      ...brief,
      source: 'curated',
    }),
  ),
]

export const LIVE_QUALITY_DEFAULT_SCORERS = [
  HourLoopScorerId.Magic,
  HourLoopScorerId.ProseCraft,
  HourLoopScorerId.StakesCost,
  HourLoopScorerId.StoryMotion,
] as const
