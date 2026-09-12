import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const HEADER = 'src/components/shell/GlobalHeader/GlobalHeader.tsx'
const INDICATOR = 'src/components/AutosaveIndicator/AutosaveIndicator.tsx'
const LOOP_CHROME = 'src/domains/loop-creator/ui/components/LoopCreatorChrome.tsx'

describe('AutosaveIndicator chrome', () => {
  it('mounts in GlobalHeader', () => {
    const src = readFileSync(HEADER, 'utf8')
    expect(src).toContain('AutosaveIndicator')
  })

  it('uses a spinning Globe while saving', () => {
    const src = readFileSync(INDICATOR, 'utf8')
    expect(src).toContain('Globe')
    expect(src).toContain('animate-spin')
  })

  it('does not keep a local Loop Creator save chip', () => {
    const src = readFileSync(LOOP_CHROME, 'utf8')
    expect(src).not.toContain('Saving...')
    expect(src).not.toContain('LoopAutoSaveStatus')
  })
})
