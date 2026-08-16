/**
 * Drop assistant wrap-up from chat copy before it is written into a bible section.
 * Tool payloads are the source of truth; this only sanitizes a prose fallback.
 */

import { hasReferences } from '@/domains/storyteller/core/entities/reference-parser'
import { WorldDescriptionFieldAlias } from '@/domains/storyteller/config/constants/bible-wire-fields'
import { readString, recordFromJson } from '@/shared/data/json-guards'

enum ChatChromeMarker {
  BibleNowLive = 'the world bible is now live',
  HeresWhatIBuilt = 'here\'s what i built',
  WouldYouLike = 'would you like to',
  WhatWasCreated = 'what was created',
  CoreConcept = 'core concept',
}

const PREAMBLE_LINE =
  /^(?:i['\u2019]ll|i will|let me|i['\u2019]m going to|i can)\b/i

const PARAGRAPH_BREAK = /\n\n+/
const PARAGRAPH_SEPARATOR = '\n\n'
const CURLY_APOSTROPHE = /[\u2018\u2019]/g
const ASCII_APOSTROPHE = '\''

function normalizeChatChrome(text: string): string {
  return text.replace(CURLY_APOSTROPHE, ASCII_APOSTROPHE).toLowerCase()
}

function firstMarkerIndex(lower: string): number {
  const indexes = [
    lower.indexOf(ChatChromeMarker.BibleNowLive),
    lower.indexOf(ChatChromeMarker.HeresWhatIBuilt),
    lower.indexOf(ChatChromeMarker.WouldYouLike),
    lower.indexOf(ChatChromeMarker.WhatWasCreated),
  ].filter(index => index >= 0)
  if (indexes.length === 0) return -1
  return Math.min(...indexes)
}

function dropLeadingPreamble(body: string): string {
  const paragraphs = body.split(PARAGRAPH_BREAK)
  while (paragraphs.length > 0) {
    const first = paragraphs[0]?.trim() ?? ''
    if (!first || !PREAMBLE_LINE.test(first)) break
    paragraphs.shift()
  }
  return paragraphs.join(PARAGRAPH_SEPARATOR).trim()
}

export function isAssistantChatWrapUp(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  if (hasReferences(trimmed)) return false
  const lower = normalizeChatChrome(trimmed)
  const firstLine = trimmed.split('\n')[0]?.trim() ?? ''
  if (PREAMBLE_LINE.test(firstLine)) return true
  return (
    lower.includes(ChatChromeMarker.BibleNowLive) ||
    lower.includes(ChatChromeMarker.HeresWhatIBuilt) ||
    lower.includes(ChatChromeMarker.WouldYouLike) ||
    (lower.includes(ChatChromeMarker.WhatWasCreated) &&
      lower.includes(ChatChromeMarker.CoreConcept))
  )
}

export function stripAssistantBibleChatChrome(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return ''

  const cutAt = firstMarkerIndex(normalizeChatChrome(trimmed))
  const withoutWrapUp = cutAt >= 0 ? trimmed.slice(0, cutAt).trim() : trimmed
  const dropped = dropLeadingPreamble(withoutWrapUp)
  if (!dropped || isAssistantChatWrapUp(dropped)) return ''
  return dropped
}

export function worldDescriptionFromToolArgs(
  toolArgs: readonly Record<string, unknown>[],
): string | undefined {
  for (const args of toolArgs) {
    const description = readString(
      recordFromJson(args)[WorldDescriptionFieldAlias.WorldDescription],
    )
    if (description && !isAssistantChatWrapUp(description)) return description
  }
  return undefined
}

export function pickWorldDescriptionForBible(
  candidates: Array<string | undefined>,
): string | undefined {
  const texts = candidates
    .map(candidate => candidate?.trim() ?? '')
    .filter(text => text.length > 0 && !isAssistantChatWrapUp(text))
  const linked = texts.find(text => hasReferences(text))
  return linked ?? texts[0]
}

function stripWrapUpFromUnknown(value: unknown): unknown {
  if (typeof value === 'string') {
    if (isAssistantChatWrapUp(value)) return undefined
    const cleaned = stripAssistantBibleChatChrome(value)
    return cleaned || undefined
  }
  if (Array.isArray(value)) {
    return value
      .map(item => stripWrapUpFromUnknown(item))
      .filter(item => item !== undefined)
  }
  if (typeof value !== 'object' || value === null) return value
  const record = recordFromJson(value)
  const next: Record<string, unknown> = {}
  for (const [key, nested] of Object.entries(record)) {
    const cleaned = stripWrapUpFromUnknown(nested)
    if (cleaned !== undefined) next[key] = cleaned
  }
  return next
}

export function episodePremiseFromUnknown(value: unknown): Record<string, unknown> | undefined {
  if (typeof value === 'string') {
    if (isAssistantChatWrapUp(value) || !value.trim()) return undefined
    const cleaned = stripAssistantBibleChatChrome(value)
    return cleaned ? { logline: cleaned } : undefined
  }
  const record = recordFromJson(stripWrapUpFromUnknown(recordFromJson(value)))
  return Object.keys(record).length > 0 ? record : undefined
}

export function episodePremiseFromToolArgs(
  toolArgs: readonly Record<string, unknown>[],
): Record<string, unknown> | undefined {
  for (const args of toolArgs) {
    const rec = recordFromJson(args)
    const data = recordFromJson(rec.data)
    const storyPlan = recordFromJson(data.storyPlan ?? rec.storyPlan)
    const premise = episodePremiseFromUnknown(
      rec.episodePremise ?? rec.premise ?? data.premise ?? storyPlan.premise,
    )
    if (premise) return premise
  }
  return undefined
}

export function pickEpisodePremise(
  candidates: Array<Record<string, unknown> | undefined>,
): Record<string, unknown> | undefined {
  for (const candidate of candidates) {
    const premise = episodePremiseFromUnknown(candidate)
    if (premise) return premise
  }
  return undefined
}
