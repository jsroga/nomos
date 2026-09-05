import { ManuscriptMode } from '@/domains/storyteller/core/types/enums'

export interface ManuscriptSpan {
  start: number
  end: number
}

enum ScriptSluglinePrefix {
  Int = 'INT.',
  Ext = 'EXT.',
  IE = 'I/E.',
}

enum NovelBreakMark {
  Asterisks = '***',
  SpacedAsterisks = '* * *',
}

enum ManuscriptLine {
  Newline = '\n',
  HeadingPrefix = '#',
}

export function isScriptSlugline(line: string): boolean {
  const trimmed = line.trim().toUpperCase()
  return (
    trimmed.startsWith(ScriptSluglinePrefix.Int) ||
    trimmed.startsWith(ScriptSluglinePrefix.Ext) ||
    trimmed.startsWith(ScriptSluglinePrefix.IE)
  )
}

export function isNovelSectionBreak(line: string): boolean {
  const trimmed = line.trim()
  if (trimmed === NovelBreakMark.Asterisks || trimmed === NovelBreakMark.SpacedAsterisks) {
    return true
  }
  if (!trimmed.startsWith(ManuscriptLine.HeadingPrefix)) return false
  const heading = trimmed.replace(/^#+\s*/, '')
  return heading.length > 0 && heading !== trimmed
}

function lineBreakOffsets(text: string, isBreak: (line: string) => boolean): number[] {
  const offsets: number[] = []
  let offset = 0
  const lines = text.split(ManuscriptLine.Newline)
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index] ?? ''
    if (isBreak(line)) offsets.push(offset)
    offset += line.length
    if (index < lines.length - 1) offset += ManuscriptLine.Newline.length
  }
  return offsets
}

function spanFromBreaks(text: string, caret: number, breaks: number[]): ManuscriptSpan | null {
  if (text.trim().length === 0) return null
  const clamped = Math.min(Math.max(caret, 0), text.length)
  const firstBreak = breaks[0]
  if (firstBreak === undefined) {
    return { start: 0, end: text.length }
  }
  if (clamped < firstBreak) {
    return { start: 0, end: firstBreak }
  }
  let start = firstBreak
  let end = text.length
  for (let index = 0; index < breaks.length; index++) {
    const current = breaks[index]
    if (current === undefined || current > clamped) break
    start = current
    const next = breaks[index + 1]
    end = next === undefined ? text.length : next
  }
  return { start, end }
}

export function manuscriptSpanAt(
  text: string,
  caret: number,
  mode: ManuscriptMode
): ManuscriptSpan | null {
  const isBreak = mode === ManuscriptMode.Novel ? isNovelSectionBreak : isScriptSlugline
  return spanFromBreaks(text, caret, lineBreakOffsets(text, isBreak))
}

export function countManuscriptSpans(text: string, mode: ManuscriptMode): number {
  if (text.trim().length === 0) return 0
  const isBreak = mode === ManuscriptMode.Novel ? isNovelSectionBreak : isScriptSlugline
  const breaks = lineBreakOffsets(text, isBreak)
  const first = breaks[0]
  if (first === undefined) return 1
  return breaks.length + (first > 0 ? 1 : 0)
}
