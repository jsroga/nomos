import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { LOOP_EMPTY_STATE_CTA_CLASS } from '@/domains/loop-creator/constants/loop-empty-state'

const EMPTY_STATE = 'src/domains/loop-creator/ui/components/LoopEmptyState.tsx'

describe('LoopEmptyState CTA', () => {
  it('uses the shared outline Button, not a custom gradient', () => {
    const src = readFileSync(EMPTY_STATE, 'utf8')
    expect(src).toContain('ButtonVariantKey.Outline')
    expect(src).toContain('ButtonSizeKey.Lg')
    expect(src).toContain('LOOP_EMPTY_STATE_CTA_CLASS')
    expect(src).not.toContain('bg-gradient-to-r')
    expect(src).not.toContain('via-purple-500')
    expect(src).not.toContain('hover:scale')
    expect(src).not.toContain('onMouseEnter')
    expect(LOOP_EMPTY_STATE_CTA_CLASS).not.toContain('hover:scale')
  })

  it('lets the CTA scroll instead of clipping under overflow-hidden', () => {
    const src = readFileSync(EMPTY_STATE, 'utf8')
    expect(src).toContain('overflow-y-auto')
    expect(src).not.toContain('overflow-hidden')
  })
})
