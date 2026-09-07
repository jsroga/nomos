export interface ManuscriptCaretSlice {
  prefix: string
  suffix: string
}

export function manuscriptCaretSlice(editor: HTMLElement): ManuscriptCaretSlice {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) {
    return { prefix: editor.innerText, suffix: '' }
  }
  const anchor = selection.anchorNode
  if (!anchor || !editor.contains(anchor)) {
    return { prefix: editor.innerText, suffix: '' }
  }
  const range = selection.getRangeAt(0)
  const before = document.createRange()
  before.selectNodeContents(editor)
  before.setEnd(range.startContainer, range.startOffset)
  const after = document.createRange()
  after.selectNodeContents(editor)
  after.setStart(range.endContainer, range.endOffset)
  return { prefix: before.toString(), suffix: after.toString() }
}

export function manuscriptPrefixBeforeCaret(editor: HTMLElement): string {
  return manuscriptCaretSlice(editor).prefix
}

/** Ghost must not paint over characters that already follow the caret. */
export function scriptGhostOverlapsManuscript(suffix: string): boolean {
  return suffix.trim().length > 0
}

/** Drop a model echo of the already-written prefix so the overlay is continuation only. */
export function scriptGhostContinuation(prefix: string, raw: string): string {
  if (raw.trim().length === 0) return ''
  if (prefix.length > 0 && raw.startsWith(prefix)) {
    return raw.slice(prefix.length)
  }
  const trimmed = raw.trimStart()
  if (prefix.length > 0 && trimmed.startsWith(prefix)) {
    return trimmed.slice(prefix.length)
  }
  return raw
}
