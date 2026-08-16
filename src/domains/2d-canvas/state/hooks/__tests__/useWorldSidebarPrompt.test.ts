import { describe, expect, it } from 'vitest'
import { GENERATION_MODES, GenerationMode } from '../../../constants/generation-modes'
import { masterPromptAfterModePick } from '../useWorldSidebarPrompt'
import { switchGenerationModeDescription } from '../../../ui/constants/sidebar'

describe('masterPromptAfterModePick', () => {
  const painted = GENERATION_MODES.find(mode => mode.id === GenerationMode.PaintedIsometric)

  it('replaces the master prompt with the mode prompt fragment', () => {
    expect(painted).toBeDefined()
    if (!painted) return

    expect(masterPromptAfterModePick('a rainy port', painted.promptFragment)).toBe(
      painted.promptFragment,
    )
    expect(painted.promptFragment).toContain('hand-painted in oil on canvas')
    expect(painted.promptFragment.length).toBeGreaterThan(80)
  })

  it('names the mode in the switch confirm copy', () => {
    expect(painted).toBeDefined()
    if (!painted) return
    expect(switchGenerationModeDescription(painted.name)).toContain(painted.name)
  })
})
