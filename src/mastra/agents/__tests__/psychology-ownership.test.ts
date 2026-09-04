import { describe, expect, it } from 'vitest'
import { composeBeatPlannerInstructions } from '../beat-planner/compose-instructions'
import { composeGrrmInstructions } from '../grrm-author/compose-instructions'

describe('psychology skill ownership', () => {
  it('loads psychology on Planner and not on Author', () => {
    const planner = composeBeatPlannerInstructions()
    const author = composeGrrmInstructions()
    expect(planner).toContain('Motivation authenticity')
    expect(planner).toContain('Character psychology')
    expect(author).not.toContain('Motivation authenticity')
    expect(author).not.toContain('Character psychology')
  })
})
