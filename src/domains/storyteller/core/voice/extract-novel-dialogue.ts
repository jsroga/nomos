export interface NovelDialogueLine {
  speaker: string | null
  text: string
}

enum NovelQuoteMark {
  Open = '"',
  Paragraph = '\n\n',
}

enum NovelSpeechVerb {
  Said = 'said',
  Asked = 'asked',
  Whispered = 'whispered',
  Muttered = 'muttered',
  Called = 'called',
  Replied = 'replied',
  Answered = 'answered',
  Snapped = 'snapped',
  Murmured = 'murmured',
}

const SPEECH_VERBS = Object.values(NovelSpeechVerb)
const ATTRIBUTION_WINDOW = 80
const NAME_PATTERN = /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\b/g
const QUOTE_PATTERN = /"([^"]+)"/g

function verbNear(window: string): boolean {
  const lower = window.toLowerCase()
  return SPEECH_VERBS.some(verb => lower.includes(verb))
}

function namesIn(window: string): string[] {
  const names: string[] = []
  NAME_PATTERN.lastIndex = 0
  let match = NAME_PATTERN.exec(window)
  while (match) {
    const name = match[1]
    if (name) names.push(name)
    match = NAME_PATTERN.exec(window)
  }
  return names
}

function clipWindow(text: string, fromEnd: boolean): string {
  const para = fromEnd ? text.lastIndexOf(NovelQuoteMark.Paragraph) : text.indexOf(NovelQuoteMark.Paragraph)
  const quote = fromEnd ? text.lastIndexOf(NovelQuoteMark.Open) : text.indexOf(NovelQuoteMark.Open)
  if (!fromEnd) {
    let end = Math.min(text.length, ATTRIBUTION_WINDOW)
    if (para >= 0) end = Math.min(end, para)
    if (quote >= 0) end = Math.min(end, quote)
    return text.slice(0, end)
  }
  let start = Math.max(0, text.length - ATTRIBUTION_WINDOW)
  if (para >= 0) start = Math.max(start, para + NovelQuoteMark.Paragraph.length)
  if (quote >= 0) start = Math.max(start, quote + 1)
  return text.slice(start)
}

function speakerFromWindow(before: string, after: string): string | null {
  const afterSlice = clipWindow(after, false)
  const beforeSlice = clipWindow(before, true)
  if (verbNear(afterSlice)) {
    const names = namesIn(afterSlice)
    const first = names[0]
    if (first) return first
  }
  if (verbNear(beforeSlice)) {
    const names = namesIn(beforeSlice)
    const last = names[names.length - 1]
    if (last) return last
  }
  return null
}

function paragraphAt(text: string, index: number): number {
  const before = text.lastIndexOf(NovelQuoteMark.Paragraph, index)
  return before < 0 ? 0 : before
}

export function extractNovelDialogue(prose: string): NovelDialogueLine[] {
  const extracted: NovelDialogueLine[] = []
  let inheritSpeaker: string | null = null
  let inheritParagraph = 0
  QUOTE_PATTERN.lastIndex = 0
  let match = QUOTE_PATTERN.exec(prose)
  while (match) {
    const text = match[1] ?? ''
    const start = match.index
    const end = start + match[0].length
    const paragraph = paragraphAt(prose, start)
    if (paragraph !== inheritParagraph) inheritSpeaker = null
    inheritParagraph = paragraph
    const attributed = speakerFromWindow(prose.slice(0, start), prose.slice(end))
    const speaker = attributed ?? inheritSpeaker
    if (attributed) inheritSpeaker = attributed
    extracted.push({ speaker, text })
    match = QUOTE_PATTERN.exec(prose)
  }
  return extracted
}

export function novelDialogueBySpeaker(prose: string): Map<string, string[]> {
  const grouped = new Map<string, string[]>()
  for (const line of extractNovelDialogue(prose)) {
    const key = line.speaker ?? ''
    const existing = grouped.get(key) ?? []
    existing.push(line.text)
    grouped.set(key, existing)
  }
  return grouped
}
