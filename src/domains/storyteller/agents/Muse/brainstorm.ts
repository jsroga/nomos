import '@/shared/data/server-guard'
import { z } from 'zod'
import {
  dealEntropyHands,
  formatEntropyHand,
  seedFromText,
  type EntropyHand,
} from '@/domains/storyteller/core/muse/entropy'
import { BEAT_PLAN_VAGUE_PHRASES } from '@/domains/storyteller/prompts/guardrails/anti-slop-phrases'
import {
  CONSEQUENCE_VERB_STEMS,
  STASIS_MARKERS,
} from '@/domains/storyteller/core/muse/constants/action-heuristics'
import { WildIdeaBatchSchema, type WildIdea } from './wild-idea-schema'
import { museAgent } from './MuseAgent'

/**
 * Muse brainstorm stage (PLAN-V2 5.2): K parallel blank-context calls, each
 * under a DIFFERENT entropy hand, followed by a deterministic action-forward
 * post-filter. Ranking happens downstream (rank.ts) — brainstorm only
 * guarantees volume + constraint variety + no obvious mush.
 */

export interface BrainstormInput {
  /** One-line premise fragment — the ONLY story context the Muse sees. */
  premiseFragment: string
  /** Character names the ideas may use (kept tiny on purpose). */
  characters: string[]
  /** Seed text (e.g. `${episodeId}:${Date.now()}`); same seed = same hands. */
  seedText: string
  /** Parallel Muse calls (default 4). */
  handCount?: number
}

export interface BrainstormResult {
  /** Ideas that survived the action-forward filter, tagged with their hand. */
  ideas: Array<WildIdea & { handMechanismId: string }>
  /** Ideas dropped by the deterministic filter, with the reason (telemetry). */
  rejected: Array<{ idea: WildIdea; reason: string }>
}

/** Model call seam — injectable for mechanics tests (same DI pattern as the workflow). */
export type MuseGenerate = (prompt: string) => Promise<unknown>

const DEFAULT_HAND_COUNT = 4

const LIST_SEPARATOR = ', '
const NO_CHARACTERS_FALLBACK = 'unnamed characters'
const REASON_VAGUE = 'vague phrase in hook'
const REASON_STASIS = 'stasis hook (no on-screen action)'
const REASON_NO_VERB = 'hook names no verb of consequence'

/** Deterministic action-forward filter — kills mush before the rank stage. */
export function filterActionForward(idea: WildIdea): string | null {
  const hook = idea.hook.toLowerCase()
  for (const phrase of BEAT_PLAN_VAGUE_PHRASES) {
    if (hook.includes(phrase)) return `${REASON_VAGUE}: "${phrase}"`
  }
  for (const marker of STASIS_MARKERS) {
    if (hook.includes(marker)) return `${REASON_STASIS}: "${marker}"`
  }
  const hasConsequenceVerb = CONSEQUENCE_VERB_STEMS.some(stem => hook.includes(stem))
  if (!hasConsequenceVerb) return REASON_NO_VERB
  return null
}

function buildMusePrompt(input: BrainstormInput, hand: EntropyHand): string {
  const characters =
    input.characters.length > 0 ? input.characters.join(LIST_SEPARATOR) : NO_CHARACTERS_FALLBACK
  return `PREMISE FRAGMENT (all the story context you get):
${input.premiseFragment}

CHARACTERS AVAILABLE: ${characters}

${formatEntropyHand(hand)}

Produce 3-5 wild ideas as JSON. Each idea: hook (WHO does WHAT irreversible thing), mechanism (how your dealt constraints produce the action — name the object, countdown, venue property), collision (what existing element it collides with and what breaks).`
}

const defaultMuseGenerate: MuseGenerate = async prompt => {
  const response = await museAgent.generate(prompt, {
    structuredOutput: { schema: WildIdeaBatchSchema },
  })
  return response.object
}

export async function brainstormWildIdeas(
  input: BrainstormInput,
  generate: MuseGenerate = defaultMuseGenerate
): Promise<BrainstormResult> {
  const handCount = input.handCount ?? DEFAULT_HAND_COUNT
  const hands = dealEntropyHands(seedFromText(input.seedText), handCount)

  const batches = await Promise.all(
    hands.map(async hand => {
      const raw = await generate(buildMusePrompt(input, hand))
      const parsed = WildIdeaBatchSchema.safeParse(raw)
      // A flaky Muse call yields nothing — never takes down the batch.
      return { hand, ideas: parsed.success ? parsed.data.ideas : [] }
    })
  )

  const ideas: BrainstormResult['ideas'] = []
  const rejected: BrainstormResult['rejected'] = []
  for (const batch of batches) {
    for (const idea of batch.ideas) {
      const reason = filterActionForward(idea)
      if (reason) {
        rejected.push({ idea, reason })
      } else {
        ideas.push({ ...idea, handMechanismId: batch.hand.mechanism.id })
      }
    }
  }
  return { ideas, rejected }
}

/** Re-export for rank.ts and tests. */
export const wildIdeaBatchSchema: z.ZodType = WildIdeaBatchSchema
