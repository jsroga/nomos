export function manuscriptPrefixBeforeCaret(editor: HTMLElement): string {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return editor.innerText
  const anchor = selection.anchorNode
  if (!anchor || !editor.contains(anchor)) return editor.innerText
  const range = selection.getRangeAt(0)
  const before = document.createRange()
  before.selectNodeContents(editor)
  before.setEnd(range.startContainer, range.startOffset)
  return before.toString()
}
