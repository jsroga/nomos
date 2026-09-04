/**
 * GRRM pack-on vs pack-off ablation (Phase 2 Slice B).
 *
 * Arm A: composeGrrmInstructions() — production default (includeSkills true).
 * Arm B: composeGrrmInstructions({ includeSkills: false }).
 *
 * Scores drafts with structural s8-slop-rate and s9-self-repetition.
 * Diagnostic only — does not flip production skills.
 *
 * No-op without WILDCARDS_AB_* + DATABASE_URL + an LLM key (same as wildcards-ab).
 * Always writes evals/results/grrm-pack-ab.json (skipped or measured).
 *
 * Usage: npx tsx evals/experiments/grrm-pack-ab.ts
 */

import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
import { composeGrrmInstructions } from '@/mastra/agents/grrm-author/compose-instructions'
import { AI_SLOP_BANNED_PHRASES } from '@/domains/storyteller/ai/prompts/guardrails/anti-slop-phrases'
import { scoreSlopRate } from '@/evals/structural/s8-slop-rate'
import { scoreSelfRepetition } from '@/evals/structural/s9-self-repetition'
import type { DumpedBeat } from '@/evals/structural/types'
import { SCORER_NOISE, REGRESSION_FLOOR, DEFAULT_JUDGING_MODEL_ID } from '@/evals/constants/thresholds'
import { complete } from '@/shared/ai/gateway'
import { LlmFeature } from '@/shared/ai/gateway/constants/llm-call'
import { systemScope, SystemScopeReason } from '@/shared/auth/project-scope'
import { TEXT_GEN_FAST_MODEL } from '@/shared/agent-kernel/models'

const ARTIFACT_PATH = 'evals/results/grrm-pack-ab.json'
const PACK_ON_FIXTURE = 'evals/fixtures/grrm-pack/compose-pack-on.txt'

const AB_BRIEFS: readonly string[] = [
  'The lieutenant must decide whether to burn the bridge with her own platoon still on the far bank.',
  'A healer discovers the plague ward has been sealed from the outside; the beat must change who holds power.',
  'Two partners split the last dose of the antidote; by the end one of them can never trust the other again.',
]

export enum GrrmPackAbStatus {
  Skipped = 'skipped',
  Measured = 'measured',
}

export interface GrrmPackAbArtifact {
  status: GrrmPackAbStatus
  reason?: string
  packOnChars: number
  packOffChars: number
  packOnFixtureChars: number
  s8: { packOn: number; packOff: number; delta: number } | null
  s9: { packOn: number; packOff: number; delta: number } | null
  scorerNoise: {
    floor: number
    note: string
  }
  timestamp: string
}

function loadEnv(): void {
  const envPath = path.resolve(process.cwd(), '.env.local')
  dotenv.config(fs.existsSync(envPath) ? { path: envPath } : undefined)
}

function hasLlmKey(): boolean {
  return Boolean(
    process.env.OPENROUTER_API_KEY ||
      process.env.JUDGING_MODEL ||
      process.env.OPENAI_API_KEY ||
      process.env.ANTHROPIC_API_KEY
  )
}

function beatFromDraft(sequence: number, content: string): DumpedBeat {
  return {
    id: `ab-${sequence}`,
    episodeId: 'ab',
    sequence,
    logline: '',
    beatType: 'scene',
    content,
    visualHook: '',
    charactersInvolved: [],
    emotionalShifts: null,
    causalDependencies: [],
    setupsPayoffs: {},
    actionTaken: '',
    consequence: '',
    storyStateChange: '',
    status: 'approved',
    imageUrl: null,
    imagePrompt: null,
  }
}

export function measureComposeArms(): {
  packOn: string
  packOff: string
  packOnChars: number
  packOffChars: number
  packOnFixtureChars: number
} {
  const packOn = composeGrrmInstructions()
  const packOff = composeGrrmInstructions({ includeSkills: false })
  const fixturePath = path.resolve(process.cwd(), PACK_ON_FIXTURE)
  const packOnFixtureChars = fs.existsSync(fixturePath)
    ? fs.readFileSync(fixturePath, 'utf8').length
    : 0
  return {
    packOn,
    packOff,
    packOnChars: packOn.length,
    packOffChars: packOff.length,
    packOnFixtureChars,
  }
}

export function scoreDraftArms(packOnDrafts: string[], packOffDrafts: string[]) {
  const corpus = [...AI_SLOP_BANNED_PHRASES]
  const onBeats = packOnDrafts.map((content, index) => beatFromDraft(index + 1, content))
  const offBeats = packOffDrafts.map((content, index) => beatFromDraft(index + 1, content))

  const s8On = scoreSlopRate(onBeats, corpus)
  const s8Off = scoreSlopRate(offBeats, corpus)
  const s9On = scoreSelfRepetition(onBeats)
  const s9Off = scoreSelfRepetition(offBeats)

  const s8OnHits = Number(s8On.metrics.hitsPerThousandTokens ?? 0)
  const s8OffHits = Number(s8Off.metrics.hitsPerThousandTokens ?? 0)
  const s9OnDistinct = Number(s9On.metrics.distinct3 ?? 0)
  const s9OffDistinct = Number(s9Off.metrics.distinct3 ?? 0)

  return {
    s8: {
      packOn: s8OnHits,
      packOff: s8OffHits,
      delta: s8OffHits - s8OnHits,
    },
    s9: {
      packOn: s9OnDistinct,
      packOff: s9OffDistinct,
      delta: s9OffDistinct - s9OnDistinct,
    },
  }
}

function writeArtifact(artifact: GrrmPackAbArtifact): void {
  const outDir = path.resolve(process.cwd(), 'evals/results')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(path.join(outDir, 'grrm-pack-ab.json'), JSON.stringify(artifact, null, 2))
  console.log(`Wrote ${ARTIFACT_PATH}`)
}

async function draftWithInstructions(
  instructions: string,
  brief: string,
  projectId: string
): Promise<string> {
  const scope = systemScope(projectId, SystemScopeReason.ProviderSmoke)
  const result = await complete({
    scope,
    model: TEXT_GEN_FAST_MODEL,
    feature: LlmFeature.StorytellerBeatDraft,
    system: instructions,
    prompt: `Write one short beat (~180 words) for this brief. Prose only.\n\n${brief}`,
  })
  return result.text
}

async function main(): Promise<void> {
  loadEnv()
  const arms = measureComposeArms()
  const base: GrrmPackAbArtifact = {
    status: GrrmPackAbStatus.Skipped,
    packOnChars: arms.packOnChars,
    packOffChars: arms.packOffChars,
    packOnFixtureChars: arms.packOnFixtureChars,
    s8: null,
    s9: null,
    scorerNoise: {
      floor: REGRESSION_FLOOR,
      note: `s8/s9 are structural; judge SCORER_NOISE floor=${REGRESSION_FLOOR}; consistency σ=${SCORER_NOISE[DEFAULT_JUDGING_MODEL_ID]?.consistency?.sigma ?? 'n/a'}`,
    },
    timestamp: new Date().toISOString(),
  }

  const projectId = process.env.WILDCARDS_AB_PROJECT_ID
  const episodeId = process.env.WILDCARDS_AB_EPISODE_ID
  if (!process.env.DATABASE_URL || !hasLlmKey() || !projectId || !episodeId) {
    base.reason =
      'needs DATABASE_URL, an LLM key, WILDCARDS_AB_PROJECT_ID, and WILDCARDS_AB_EPISODE_ID'
    writeArtifact(base)
    console.log(`grrm-pack-ab: skipped — ${base.reason}`)
    return
  }

  const packOnDrafts: string[] = []
  const packOffDrafts: string[] = []
  for (const brief of AB_BRIEFS) {
    console.log(`\n> brief: ${brief.slice(0, 72)}…`)
    packOnDrafts.push(await draftWithInstructions(arms.packOn, brief, projectId))
    packOffDrafts.push(await draftWithInstructions(arms.packOff, brief, projectId))
  }

  const scored = scoreDraftArms(packOnDrafts, packOffDrafts)
  writeArtifact({
    ...base,
    status: GrrmPackAbStatus.Measured,
    reason: undefined,
    s8: scored.s8,
    s9: scored.s9,
  })
  console.log('\n=== GRRM pack A/B (pack-on → pack-off) ===')
  console.log(
    `s8 hits/1k  ${scored.s8.packOn.toFixed(3)} → ${scored.s8.packOff.toFixed(3)}  (Δ ${scored.s8.delta.toFixed(3)})`
  )
  console.log(
    `s9 distinct3 ${scored.s9.packOn.toFixed(3)} → ${scored.s9.packOff.toFixed(3)}  (Δ ${scored.s9.delta.toFixed(3)})`
  )
}

void main()
