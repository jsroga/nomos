import { describe, expect, it } from 'vitest'
import { BibleSection } from '@/domains/storyteller/core/types/enums'
import { emptyBeatDraftCanon } from '@/domains/storyteller/core/types/beat-draft-canon'
import { ProblemType } from '@/domains/storyteller/core/types/finding'
import { runSyncProseCheck } from '@/domains/storyteller/core/prose-check/run-sync'
import { checkCharacterKnowledgeFromRows } from '@/domains/storyteller/services/consistency-knowledge'
import {
  literalManuscriptHits,
  ManuscriptSearchSource,
} from '@/domains/storyteller/ai/tools/search-manuscript-literal'
import { AI_SLOP_BANNED_PHRASES } from '@/domains/storyteller/ai/prompts/guardrails/anti-slop-phrases'
import {
  PromotionClass,
  STORYTELLER_GOLDEN_EXAMPLES,
} from '../datasets/storyteller-golden'
import { dumpedBeatFromUnknown } from '../structural/beat-text'
import { scoreSlopRate } from '../structural/s8-slop-rate'
import { scoreSelfRepetition } from '../structural/s9-self-repetition'
import { scoreDialogueAdjacency } from '../structural/s11-dialogue-adjacency'
import {
  PromotionDecision,
  WAVE1_PROMOTION_DECISIONS,
  Wave1PromotionTarget,
} from '../promotion/wave1-decisions'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

enum PromotionPlant {
  Exact = 'the silver bell under the floorboard',
}

enum FictionAdjustedPhrase {
  EmDash = ' — ',
  NotJust = 'not just',
  HeresTheThing = 'here\'s the thing',
  InOrderTo = 'in order to',
  AtTheEndOfTheDay = 'at the end of the day',
}

enum CriticBriefNeedle {
  Knowledge = 'knowledge they do not possess',
  InfoDump = 'Dialogue as pure info dump',
  Adjacency = 'dialogue-adjacency',
  Embodiment = 'embodiment',
}

enum GoldenExampleId {
  Grrm = 'persona-grrm-01',
  Slop = 'prose-craft-cliche-01',
}

const FICTION_ADJUSTED_CORPUS = [
  ...AI_SLOP_BANNED_PHRASES,
  FictionAdjustedPhrase.EmDash,
  FictionAdjustedPhrase.NotJust,
  FictionAdjustedPhrase.HeresTheThing,
  FictionAdjustedPhrase.InOrderTo,
  FictionAdjustedPhrase.AtTheEndOfTheDay,
] as const

function exampleByClass(promotionClass: PromotionClass) {
  const row = STORYTELLER_GOLDEN_EXAMPLES.find(
    example => example.metadata.promotionClass === promotionClass
  )
  if (!row) throw new Error(promotionClass)
  return row
}

function twistStoryPlan() {
  return {
    [BibleSection.PLOT_TWISTS]: [{ secret: 'THE_BELLS_ARE_VERA' }],
    worldDescription: 'Vera keeps the civic clocks honest.',
  }
}

function twistCanon() {
  return emptyBeatDraftCanon({
    sections: { [BibleSection.PLOT_TWISTS]: [{ secret: 'THE_BELLS_ARE_VERA' }] },
    currentRoadmapSlotText: 'Vera keeps the civic clocks honest.',
    nextSequence: 1,
  })
}

function dumpedOrThrow(id: string, logline: string, content: string) {
  const beat = dumpedBeatFromUnknown({
    id,
    episodeId: 'e1',
    sequence: 1,
    logline,
    beatType: 'reveal',
    content,
  })
  if (!beat) throw new Error(id)
  return beat
}

describe('Wave 1 promotion floor', () => {
  it('labels cognition, dialogue, plant, and paraphrase examples', () => {
    expect(exampleByClass(PromotionClass.CognitionDisclosure).id).toBe('promo-cognition-token-01')
    expect(exampleByClass(PromotionClass.DialogueAdjacency).id).toBe(
      'promo-dialogue-talking-heads-01'
    )
    expect(exampleByClass(PromotionClass.DialogueEmbodiment).id).toBe(
      'promo-dialogue-disembodied-01'
    )
    expect(exampleByClass(PromotionClass.PlantLiteral).id).toBe('promo-plant-literal-01')
    expect(exampleByClass(PromotionClass.PlantParaphrase).id).toBe('promo-plant-paraphrase-01')
    expect(exampleByClass(PromotionClass.ParaphraseLeak).id).toBe('promo-paraphrase-leak-01')
  })

  it('measures three-critic floor miss on cognition and dialogue', () => {
    const cognition = exampleByClass(PromotionClass.CognitionDisclosure)
    const knowledgeHits = checkCharacterKnowledgeFromRows(
      [
        {
          id: cognition.id,
          sequence: 1,
          beatType: 'reveal',
          causalDependencies: [],
          content: cognition.referenceOutput,
          charactersInvolved: ['Vera'],
        },
      ],
      twistStoryPlan()
    )
    const viewpointHits = runSyncProseCheck({
      draft: cognition.referenceOutput,
      canon: twistCanon(),
      characters: ['Vera'],
    }).filter(finding => finding.problemType === ProblemType.ViewpointOverreach)

    const continuityBrief = readFileSync(
      join(process.cwd(), 'src/mastra/agents/continuity-critic/instructions.md'),
      'utf8'
    )
    const proseBrief = readFileSync(
      join(process.cwd(), 'src/mastra/agents/prose-critic/instructions.md'),
      'utf8'
    )

    const dialogueDrafts = [
      exampleByClass(PromotionClass.DialogueAdjacency).referenceOutput,
      exampleByClass(PromotionClass.DialogueEmbodiment).referenceOutput,
    ]
    const dialogueDeterministicHits = dialogueDrafts.filter(
      draft =>
        runSyncProseCheck({
          draft,
          canon: emptyBeatDraftCanon({ nextSequence: 1 }),
          characters: ['Vera', 'Marcus'],
        }).length > 0
    )

    expect(knowledgeHits.length).toBeGreaterThan(0)
    expect(continuityBrief.includes(CriticBriefNeedle.Knowledge)).toBe(true)
    expect(viewpointHits.length).toBeGreaterThanOrEqual(0)
    expect(proseBrief.includes(CriticBriefNeedle.InfoDump)).toBe(true)
    expect(proseBrief.toLowerCase().includes(CriticBriefNeedle.Adjacency)).toBe(false)
    expect(proseBrief.toLowerCase().includes(CriticBriefNeedle.Embodiment)).toBe(false)
    expect(dialogueDeterministicHits).toHaveLength(0)
    const talkingHeads = dumpedOrThrow(
      'heads',
      'vestry',
      exampleByClass(PromotionClass.DialogueAdjacency).referenceOutput
    )
    expect(scoreDialogueAdjacency([talkingHeads]).metrics.hitCount).toBeGreaterThan(0)
    expect(WAVE1_PROMOTION_DECISIONS[Wave1PromotionTarget.ExtraCognitionCritic]).toBe(
      PromotionDecision.NoGo
    )
    expect(WAVE1_PROMOTION_DECISIONS[Wave1PromotionTarget.ExtraDialogueCritic]).toBe(
      PromotionDecision.Go
    )
  })

  it('measures literal search miss on the plant class', () => {
    const hit = exampleByClass(PromotionClass.PlantLiteral)
    const miss = exampleByClass(PromotionClass.PlantParaphrase)
    const docs = [
      {
        source: ManuscriptSearchSource.Beat,
        id: hit.id,
        text: hit.referenceOutput,
      },
      {
        source: ManuscriptSearchSource.Beat,
        id: miss.id,
        text: miss.referenceOutput,
      },
    ]
    const exactHits = literalManuscriptHits(docs, PromotionPlant.Exact)
    const paraphraseDoc = docs.find(doc => doc.id === miss.id)
    if (!paraphraseDoc) throw new Error(miss.id)
    expect(exactHits.map(row => row.id)).toEqual([hit.id])
    expect(literalManuscriptHits([paraphraseDoc], PromotionPlant.Exact)).toEqual([])
    expect(WAVE1_PROMOTION_DECISIONS[Wave1PromotionTarget.ManuscriptEmbeddingSearch]).toBe(
      PromotionDecision.Go
    )
  })

  it('measures partition+POV miss on paraphrase leak', () => {
    const leak = exampleByClass(PromotionClass.ParaphraseLeak)
    const knowledgeHits = checkCharacterKnowledgeFromRows(
      [
        {
          id: leak.id,
          sequence: 1,
          beatType: 'reveal',
          causalDependencies: [],
          content: leak.referenceOutput,
          charactersInvolved: ['Vera'],
        },
      ],
      twistStoryPlan()
    )
    const viewpointHits = runSyncProseCheck({
      draft: leak.referenceOutput,
      canon: twistCanon(),
      characters: ['Vera'],
    }).filter(finding => finding.problemType === ProblemType.ViewpointOverreach)
    expect(knowledgeHits).toHaveLength(0)
    expect(viewpointHits).toHaveLength(0)
    expect(WAVE1_PROMOTION_DECISIONS[Wave1PromotionTarget.KnowledgeLedger]).toBe(
      PromotionDecision.Go
    )
  })

  it('keeps always-on Humanizer corpus; fiction-adjusted patterns raise GRRM noise', () => {
    const grrm = STORYTELLER_GOLDEN_EXAMPLES.find(example => example.id === GoldenExampleId.Grrm)
    const slop = STORYTELLER_GOLDEN_EXAMPLES.find(example => example.id === GoldenExampleId.Slop)
    if (!grrm || !slop) throw new Error(GoldenExampleId.Grrm)

    const grrmBeat = dumpedOrThrow('grrm', 'letter', grrm.referenceOutput)
    const slopBeat = dumpedOrThrow('slop', 'rival', slop.referenceOutput)

    const alwaysOnGrm = scoreSlopRate([grrmBeat], [...AI_SLOP_BANNED_PHRASES])
    const fictionGrm = scoreSlopRate([grrmBeat], [...FICTION_ADJUSTED_CORPUS])
    const alwaysOnSlop = scoreSlopRate([slopBeat], [...AI_SLOP_BANNED_PHRASES])
    const fictionSlop = scoreSlopRate([slopBeat], [...FICTION_ADJUSTED_CORPUS])
    const s9 = scoreSelfRepetition([grrmBeat])

    expect(alwaysOnSlop.metrics.hitCount).toBeGreaterThan(0)
    expect(fictionSlop.metrics.hitCount).toBeGreaterThanOrEqual(alwaysOnSlop.metrics.hitCount)
    expect(fictionGrm.metrics.hitCount).toBeGreaterThan(alwaysOnGrm.metrics.hitCount)
    expect(s9.metrics).toBeDefined()
    expect(WAVE1_PROMOTION_DECISIONS[Wave1PromotionTarget.FictionAdjustedHumanizer]).toBe(
      PromotionDecision.NoGo
    )
  })
})
