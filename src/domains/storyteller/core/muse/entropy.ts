/**
 * Entropy injector (PLAN-V2 5.1 / D4): seeded, code-side randomness for the
 * Muse brainstorm stage. The model never picks its own "random" — LLM
 * randomness collapses to clichés; dice do not.
 *
 * Pure core module: deterministic given a seed (mechanics tests), no IO.
 */

import { CRAFT_MECHANISMS, type CraftMechanism } from './constants/craft-contrast'
import {
  PROP_CARDS,
  URGENCY_CARDS,
  VENUE_CARDS,
  REVERSAL_CARDS,
} from './constants/entropy-cards'

/** One dealt hand — the constraints a single Muse call must satisfy. */
export interface EntropyHand {
  /** Craft mechanism the idea must be built THROUGH (never imitated). */
  mechanism: CraftMechanism
  /** Object that must be instrumental to the action. */
  prop: string
  /** Visible countdown the action must run against. */
  urgency: string
  /** Place whose properties the action must exploit. */
  venue: string
  /** Required irreversible-turn shape. */
  reversal: string
}

/** mulberry32 — tiny deterministic PRNG (seeded; good enough for card draws). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Derive a numeric seed from arbitrary text (episode id + date, etc.). */
export function seedFromText(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function draw<T>(rng: () => number, deck: readonly T[]): T {
  return deck[Math.floor(rng() * deck.length)]
}

/**
 * Deal `count` distinct hands. Mechanisms are dealt WITHOUT replacement across
 * the batch (each parallel Muse call gets a different craft lens); the smaller
 * decks may repeat across hands but never within one.
 */
export function dealEntropyHands(seed: number, count: number): EntropyHand[] {
  const rng = mulberry32(seed)
  const mechanisms = [...CRAFT_MECHANISMS]
  const hands: EntropyHand[] = []

  for (let i = 0; i < count; i++) {
    // Without-replacement mechanism draw (reshuffle when exhausted).
    if (mechanisms.length === 0) mechanisms.push(...CRAFT_MECHANISMS)
    const mechanismIndex = Math.floor(rng() * mechanisms.length)
    const [mechanism] = mechanisms.splice(mechanismIndex, 1)

    hands.push({
      mechanism,
      prop: draw(rng, PROP_CARDS),
      urgency: draw(rng, URGENCY_CARDS),
      venue: draw(rng, VENUE_CARDS),
      reversal: draw(rng, REVERSAL_CARDS),
    })
  }
  return hands
}

const HAND_HEADER_MECHANISM =
  'CRAFT MECHANISM (build the idea THROUGH this shape; never reference or imitate the source):'
const HAND_HEADER_CONSTRAINTS = 'HARD CONSTRAINTS (all four must be satisfied by on-screen ACTION):'

/** Render one hand as the constraint block for a Muse prompt. */
export function formatEntropyHand(hand: EntropyHand): string {
  return [
    HAND_HEADER_MECHANISM,
    `- ${hand.mechanism.mechanism}`,
    `- Why it works: ${hand.mechanism.whyItWorks}`,
    `- Do NOT do the cheap version: ${hand.mechanism.antiPattern}`,
    '',
    HAND_HEADER_CONSTRAINTS,
    `- Instrumental object: ${hand.prop}`,
    `- Countdown: ${hand.urgency}`,
    `- Setting to exploit: ${hand.venue}`,
    `- Required turn: ${hand.reversal}`,
  ].join('\n')
}
