/**
 * Action-forward heuristics data (PLAN-V2 5.2): word lists used by the
 * deterministic Muse post-filter. Cheap stem matching — the point is to
 * reject "X feels/realizes/is" mush before ranking, not to parse English.
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
