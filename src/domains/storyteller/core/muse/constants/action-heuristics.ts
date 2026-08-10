/**
 * Jacek Confirm this regex — word lists that judge meaning, not structure.
 * The Muse post-filter decides whether a hook is "action-forward" or "stasis"
 * by matching English verb stems. Pending confirmation: either delete these and
 * move the criterion into the Muse/critic prompt, or approve them as-is.
 * See .local/findings/word-dictionary-heuristics.md (Group A).
 */

/** Verb stems that signal an on-screen action with consequences. */
export const CONSEQUENCE_VERB_STEMS: readonly string[] = [
  'sign', 'burn', 'steal', 'swallow', 'lock', 'break', 'cut', 'pay', 'sell',
  'buy', 'forge', 'poison', 'marry', 'swear', 'confess', 'accuse', 'betray',
  'free', 'trap', 'hide', 'reveal', 'destroy', 'deliver', 'refuse', 'accept',
  'swap', 'plant', 'send', 'kill', 'save', 'bury', 'dig', 'open', 'seal',
  'trade', 'promise', 'renounce', 'abandon', 'claim', 'surrender', 'smuggle',
  'mistranslate', 'erase', 'brand', 'bind', 'release', 'expose', 'withhold',
  'give', 'take', 'throw', 'hand', 'tear', 'spill', 'switch', 'replace',
]

/** Interior-state markers — hooks built on these are stasis, not story. */
export const STASIS_MARKERS: readonly string[] = [
  'realizes', 'reflects', 'contemplates', 'feels', 'senses', 'notices',
  'wonders', 'remembers', 'considers', 'is haunted', 'is torn', 'must decide',
  'grapples with', 'comes to terms',
]
