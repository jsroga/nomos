/**
 * Single source of truth for AI slop phrases.
 * Used as prompt guidance so the model avoids slop proactively — quality is
 * judged by the LLM critique, not regex scoring.
 */

export const AI_SLOP_BANNED_PHRASES = [
  'it\'s worth noting',
  'it\'s important to remember',
  'interestingly enough',
  'in a world where',
  'little did they know',
  'a testament to',
  'the weight of',
  'this speaks to the broader theme',
  'a tapestry of',
  'navigate the complexities',
  'embark on a journey',
  'a unique perspective',
  'delve into',
  'myriad of',
  'resonate with',
  'landscape of',
  'unveiling',
  'the key is',
  'it should be noted',
  'in many ways',
  'it\'s important to note',
  'tension was palpable',
  'a chill ran down',
  'her heart pounded',
  'his heart pounded',
  'their heart pounded',
  'his blood ran cold',
  'her blood ran cold',
  'eyes widened in shock',
  'if only they knew',
  'if only he knew',
  'if only she knew',
  'he felt sad',
  'he felt happy',
  'he felt angry',
  'he felt scared',
  'she felt sad',
  'she felt happy',
  'she felt angry',
  'she felt scared',
  'nodded his head',
  'nodded her head',
  'shrugged his shoulders',
  'shrugged her shoulders',
  'orbs',
  'crimson liquid',
  'obsidian locks',
  'porcelain skin',
  'alabaster',
] as const

/**
 * Vagueness phrases banned from beat-plan goal/conflict/turn fields — a plan
 * built on these gives the author nothing concrete to dramatize. Checked by
 * the beat-plan concreteness gate (case-insensitive substring match).
 */
export const BEAT_PLAN_VAGUE_PHRASES = [
  'something happens',
  'things get worse',
  'things escalate',
  'tension rises',
  'tensions rise',
  'the stakes are raised',
  'stakes get higher',
  'a confrontation occurs',
  'they have a confrontation',
  'learns a secret',
  'discovers the truth',
  'discovers a secret',
  'reveals a secret',
  'everything changes',
  'nothing will be the same',
  'must make a choice',
  'faces a difficult decision',
  'comes to a realization',
  'realizes something',
  'deals with the fallout',
  'confronts their past',
  'the truth comes out',
] as const

/** Markdown bullet list for injection into agent prompts. */
export function formatBannedPhrasesForPrompt(
  phrases: readonly string[] = AI_SLOP_BANNED_PHRASES
): string {
  return phrases.map(phrase => `- "${phrase.charAt(0).toUpperCase()}${phrase.slice(1)}..."`).join('\n')
}
