import { recordFromJson, readString } from '@/shared/data/json-guards'
import type { ManuscriptSpan } from '@/domains/storyteller/core/manuscript/manuscript-span'

enum ManuscriptSpliceJoin {
  Blocks = '\n\n',
}

export function spliceManuscriptSection(
  scriptContent: string,
  span: ManuscriptSpan | null,
  nextSection: string
): string {
  const next = nextSection.trimEnd()
  if (span === null) {
    const existing = scriptContent.trimEnd()
    if (existing.length === 0) return next
    return `${existing}${ManuscriptSpliceJoin.Blocks}${next}`
  }
  return `${scriptContent.slice(0, span.start)}${next}${scriptContent.slice(span.end)}`
}

export function persistManuscriptSectionOnVerdict(input: {
  killed: boolean
  saved: boolean
  scriptContent: string
  span: ManuscriptSpan | null
  finalDraft: string
}): string | null {
  if (input.killed || !input.saved) return null
  const draft = input.finalDraft.trim()
  if (draft.length === 0) return null
  return spliceManuscriptSection(input.scriptContent, input.span, draft)
}

export function manuscriptVerdictOutputFromResume(result: unknown): {
  finalDraft: string
  killed: boolean
  saved: boolean
} | null {
  const record = recordFromJson(result)
  const output = recordFromJson(record.output)
  const finalDraft = readString(output.finalDraft)
  if (finalDraft === undefined) return null
  return {
    finalDraft,
    killed: output.killed === true,
    saved: output.saved === true,
  }
}
