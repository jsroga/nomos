import { describe, expect, it } from 'vitest'
import { PromptSectionHeading } from '../constants/prompt-catalog'
import { replaceAvailableToolsSection } from '../available-tools-section'

enum RetiredToolId {
  Planner = 'planner_tool',
}

describe('replaceAvailableToolsSection', () => {
  it('replaces a stale tools block and drops retired ids', () => {
    const stale = [
      'Preamble',
      PromptSectionHeading.AvailableTools,
      `- ${RetiredToolId.Planner}: Manage your work plan`,
      '## Strategy',
      'Do the work.',
    ].join('\n')
    const out = replaceAvailableToolsSection(stale, [
      { id: 'get_game_loops', description: 'Fetch loops.\nMore detail.' },
    ])
    expect(out).not.toContain(RetiredToolId.Planner)
    expect(out).toContain('- get_game_loops: Fetch loops.')
    expect(out).toContain('## Strategy')
    expect(out).toContain('Do the work.')
  })

  it('appends a tools block when the heading is missing', () => {
    const out = replaceAvailableToolsSection('Hello', [{ id: 'design_atomic_systems', description: 'Atoms.' }])
    expect(out.startsWith('Hello')).toBe(true)
    expect(out).toContain(PromptSectionHeading.AvailableTools)
    expect(out).toContain('- design_atomic_systems: Atoms.')
  })
})
