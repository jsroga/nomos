/** Mention context XML wire constants. */

export const MENTION_CONTEXT_OPEN = '<mentioned_context>'
export const MENTION_CONTEXT_CLOSE = '</mentioned_context>'

export const MENTION_CONTEXT_EMPTY_OBJECT = '{}'
export const MENTION_CONTEXT_EMPTY_ARRAY = '[]'

export enum XmlEscapeReplacement {
  Amp = '&amp;',
  Lt = '&lt;',
  Gt = '&gt;',
  Quot = '&quot;',
  Apos = '&apos;',
}
