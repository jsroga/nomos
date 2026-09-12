import { describe, expect, it } from 'vitest'
import { prettyPrint, prettyPrintText, prettyUnwrap } from '../mastra-studio-pretty.mjs'

const NESTED_JSON_STRING = '{"draft":"{\\"name\\":\\"Vex\\"}","canonText":"line one\\\\nline two"}'
const MARKDOWN_ESCAPED = '## Title\\n\\nA paragraph.'
const PLAIN = 'not json at all'

describe('prettyUnwrap', () => {
  it('parses nested JSON objects trapped in strings', () => {
    const wrapped = { draft: '{"name":"Vex","role":"mage"}' }
    expect(prettyUnwrap(wrapped)).toEqual({
      draft: { name: 'Vex', role: 'mage' },
    })
  })

  it('unescapes markdown newlines in non-JSON strings', () => {
    expect(prettyUnwrap(MARKDOWN_ESCAPED)).toBe('## Title\n\nA paragraph.')
  })

  it('leaves non-JSON strings alone when they have no escaped newlines', () => {
    expect(prettyUnwrap(PLAIN)).toBe(PLAIN)
  })

  it('is idempotent', () => {
    const once = prettyUnwrap(JSON.parse(NESTED_JSON_STRING))
    expect(prettyUnwrap(once)).toEqual(once)
  })
})

describe('prettyPrint', () => {
  it('pretty-prints unwrapped objects with indentation', () => {
    const printed = prettyPrint({ draft: '{"name":"Vex"}' })
    expect(printed).toContain('"name": "Vex"')
    expect(printed).toContain('\n')
  })
})

describe('prettyPrintText', () => {
  it('unwraps a JSON document string', () => {
    const printed = prettyPrintText('{"draft":"{\\"ok\\":true}"}')
    expect(printed).toContain('"ok": true')
  })

  it('returns empty input unchanged', () => {
    expect(prettyPrintText('')).toBe('')
  })
})
