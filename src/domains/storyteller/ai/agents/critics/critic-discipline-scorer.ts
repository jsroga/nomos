import { createScorer } from '@mastra/core/evals'
import { readString, recordFromJson } from '@/shared/data/json-guards'

/**
 * Deterministic eval scorer for critic discipline (item 36): a critic report
 * over prose with a PLANTED cliché must (a) quote the planted cliché and
 * (b) offer NO rewrites — diagnosis only, per CRITIC_RULES. Any rewrite offer
 * is an automatic fail: rewriting is how a committee sands voice into beige.
 *
 * The golden row supplies the planted cliché via `input.plantedCliche`.
 */

/**
 * Jacek Confirm this regex — decides "the critic offered a rewrite" by matching
 * 15 English phrasings. Pending confirmation: approve, or let a judge model make
 * the call. See .local/findings/word-dictionary-heuristics.md (Group A).
 */
const REWRITE_MARKERS = [
  'instead, try',
  'instead try',
  'rewrite it as',
  'rewrite as',
  'suggested revision',
  'suggested rewrite',
  'you could write',
  'replace it with',
  'rephrase it as',
  'consider rewriting',
  'try something like',
  'here is a rewrite',
  'here\'s a rewrite',
  'a better version',
] as const

export const criticDisciplineScorer = createScorer({
  id: 'critic-discipline',
  name: 'Critic Discipline',
  description:
    'Deterministic: the critic report must quote the planted cliché and must not suggest any rewrite (diagnosis only).',
})
  .generateScore(({ run }) => {
    const planted = readString(recordFromJson(run.input).plantedCliche)
    if (!planted) return 0
    const report = typeof run.output === 'string' ? run.output : JSON.stringify(run.output)
    const lower = report.toLowerCase()
    const quoted = lower.includes(planted.toLowerCase())
    const rewrites = REWRITE_MARKERS.some(marker => lower.includes(marker))
    return quoted && !rewrites ? 1 : 0
  })
  .generateReason(({ run, score }) => {
    const planted = readString(recordFromJson(run.input).plantedCliche)
    if (!planted) return 'No plantedCliche in the example input — cannot judge discipline.'
    const report = typeof run.output === 'string' ? run.output : JSON.stringify(run.output)
    const lower = report.toLowerCase()
    const quoted = lower.includes(planted.toLowerCase())
    const rewriteHit = REWRITE_MARKERS.find(marker => lower.includes(marker))
    if (!quoted) return `Score ${score.toFixed(2)} — planted cliché "${planted}" was never quoted.`
    if (rewriteHit) return `Score ${score.toFixed(2)} — report offers a rewrite ("${rewriteHit}"), which critics must never do.`
    return `Score ${score.toFixed(2)} — cliché quoted, no rewrites offered.`
  })
