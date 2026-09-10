import { describe, expect, it } from 'vitest'
import {
  REPAINT_DEFAULT_PROMPT,
  REPAINT_MASK_INSTRUCTION,
  REPAINT_STYLE_REF_PREFIX,
  buildRepaintPrompt,
} from '../repaint-gemini'

describe('buildRepaintPrompt', () => {
  it('wraps the user subject in the GPT Image 2 mask instruction', () => {
    expect(buildRepaintPrompt('shop')).toBe(`${REPAINT_MASK_INSTRUCTION}shop`)
  })

  it('falls back to the default subject when the input is empty', () => {
    expect(buildRepaintPrompt('')).toBe(`${REPAINT_MASK_INSTRUCTION}${REPAINT_DEFAULT_PROMPT}`)
    expect(buildRepaintPrompt('   ')).toBe(
      `${REPAINT_MASK_INSTRUCTION}${REPAINT_DEFAULT_PROMPT}`,
    )
    expect(buildRepaintPrompt(undefined)).toBe(
      `${REPAINT_MASK_INSTRUCTION}${REPAINT_DEFAULT_PROMPT}`,
    )
  })

  it('appends style-reference URLs after the subject', () => {
    const urls = ['https://cdn.example.com/a.png', 'https://cdn.example.com/b.png']
    const prompt = buildRepaintPrompt('shop', urls)
    expect(prompt.startsWith(`${REPAINT_MASK_INSTRUCTION}shop`)).toBe(true)
    expect(prompt.indexOf('shop')).toBeLessThan(prompt.indexOf(REPAINT_STYLE_REF_PREFIX))
    expect(prompt).toContain(urls[0])
    expect(prompt).toContain(urls[1])
  })
})
