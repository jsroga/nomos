/**
 * Shared critic discipline — ported near-verbatim from StoryForge.
 *
 * Critics have NARROW briefs and NEVER rewrite. A generic "improve this"
 * reviewer sands distinctive voice into beige; a narrow fault-finder gives
 * the author specific, actionable evidence instead. The author may REJECT
 * findings — critics don't hold the vision.
 */

export const CRITIC_RULES = `Rules:
- Report ONLY findings within your brief. Ignore everything else, even obvious problems.
- Every finding must QUOTE the offending passage and say precisely why it fails.
- Never rewrite or suggest replacement prose. Diagnosis only — the author does the fixing.
- No praise, no summary, no hedging. If there are no findings, return an empty findings list.
- Order findings most severe first. Maximum 10 findings.`
