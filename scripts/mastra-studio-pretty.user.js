// ==UserScript==
// @name         Mastra Studio Pretty Step output
// @namespace    nomos.gg
// @version      1.1.0
// @description  Pretty-print JSON and markdown trapped in Studio Step output strings
// @match        http://localhost:4111/*
// @grant        none
// ==/UserScript==

;(function mastraStudioPretty() {
  const CONTROL_ID = 'nomos-mastra-pretty-control'
  const CONTROL_LABEL = 'Pretty'
  const PRETTY_ATTR = 'data-nomos-pretty'
  const PRETTY_DONE = '1'
  const JSON_OBJECT_PREFIX = '{'
  const JSON_ARRAY_PREFIX = '['
  const ESCAPED_NEWLINE = '\\n'
  const NEWLINE = '\n'
  const DEBOUNCE_MS = 200
  const SKIP_CLOSEST =
    '[contenteditable="true"], textarea, input, .monaco-editor, .cm-editor, .cm-content'

  function looksLikeJsonContainer(value) {
    const trimmed = value.trim()
    return trimmed.startsWith(JSON_OBJECT_PREFIX) || trimmed.startsWith(JSON_ARRAY_PREFIX)
  }

  function tryParseJson(value) {
    try {
      return { ok: true, parsed: JSON.parse(value) }
    } catch {
      return { ok: false, parsed: undefined }
    }
  }

  function unescapeMarkdownNewlines(value) {
    if (!value.includes(ESCAPED_NEWLINE)) return value
    if (looksLikeJsonContainer(value)) return value
    return value.replaceAll(ESCAPED_NEWLINE, NEWLINE)
  }

  function prettyUnwrap(value) {
    if (typeof value === 'string') {
      if (looksLikeJsonContainer(value)) {
        const attempt = tryParseJson(value)
        if (attempt.ok) return prettyUnwrap(attempt.parsed)
      }
      return unescapeMarkdownNewlines(value)
    }
    if (Array.isArray(value)) return value.map(prettyUnwrap)
    if (value !== null && typeof value === 'object') {
      const next = {}
      for (const [key, child] of Object.entries(value)) {
        next[key] = prettyUnwrap(child)
      }
      return next
    }
    return value
  }

  function prettyPrintText(raw) {
    const trimmed = raw.trim()
    if (!trimmed) return raw
    if (looksLikeJsonContainer(trimmed)) {
      const attempt = tryParseJson(trimmed)
      if (attempt.ok) {
        const unwrapped = prettyUnwrap(attempt.parsed)
        return typeof unwrapped === 'string' ? unwrapped : JSON.stringify(unwrapped, null, 2)
      }
    }
    const unwrapped = prettyUnwrap(trimmed)
    return typeof unwrapped === 'string' ? unwrapped : JSON.stringify(unwrapped, null, 2)
  }

  function shouldSkipNode(node) {
    if (!(node instanceof HTMLElement)) return true
    if (node.getAttribute(PRETTY_ATTR) === PRETTY_DONE) return true
    if (node.isContentEditable) return true
    if (node.closest(SKIP_CLOSEST)) return true
    return false
  }

  function prettyBlocks() {
    const nodes = document.querySelectorAll('pre, code')
    for (const node of nodes) {
      if (shouldSkipNode(node)) continue
      const raw = node.textContent ?? ''
      const next = prettyPrintText(raw)
      if (next === raw) continue
      node.textContent = next
      node.setAttribute(PRETTY_ATTR, PRETTY_DONE)
    }
  }

  function mountControl() {
    if (document.getElementById(CONTROL_ID)) return
    const button = document.createElement('button')
    button.id = CONTROL_ID
    button.type = 'button'
    button.textContent = CONTROL_LABEL
    button.style.position = 'fixed'
    button.style.bottom = '16px'
    button.style.right = '16px'
    button.style.zIndex = '2147483647'
    button.style.padding = '8px 12px'
    button.addEventListener('click', prettyBlocks)
    document.body.appendChild(button)
  }

  let prettyTimer = 0
  function schedulePretty() {
    window.clearTimeout(prettyTimer)
    prettyTimer = window.setTimeout(() => {
      prettyBlocks()
      mountControl()
    }, DEBOUNCE_MS)
  }

  mountControl()
  const observer = new MutationObserver(schedulePretty)
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  })
})()
