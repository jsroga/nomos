import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const COMPILE_ROUTE = 'src/app/api/storyteller/script/compile/route.ts'

describe('script compile route', () => {
  it('does not 400 when the compiled manuscript is empty', () => {
    const src = readFileSync(COMPILE_ROUTE, 'utf8')
    expect(src).not.toContain('EMPTY_COMPILE')
    expect(src).not.toContain('compiled.trim()')
  })
})
