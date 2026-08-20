import { describe, expect, it } from 'vitest'
import {
  MASTER_PROMPT_CLAMP_MAX_PX,
  MASTER_PROMPT_EXPAND_PX,
  MASTER_PROMPT_FADE_HEIGHT_PX,
  MasterPromptFieldClass,
} from '../constants/master-prompt-field'
import { masterPromptBodyClassName } from '../master-prompt-body-class-name'

describe('MasterPromptField collapsed fade', () => {
  it('paints the fade on a text preview, not on the native textarea', () => {
    expect(MasterPromptFieldClass.Preview.split(' ')).toEqual(
      expect.arrayContaining(['overflow-hidden', 'whitespace-pre-wrap']),
    )
    expect(MasterPromptFieldClass.BodyCollapsed.split(' ')).toEqual(
      expect.arrayContaining(['absolute', 'text-transparent', 'z-[2]']),
    )
  })

  it('uses the 2d-canvas collapsed box on every sidebar', () => {
    expect(MasterPromptFieldClass.FrameClamped.split(' ')).toEqual(
      expect.arrayContaining([
        `h-[${MASTER_PROMPT_CLAMP_MAX_PX}px]`,
        `min-h-[${MASTER_PROMPT_CLAMP_MAX_PX}px]`,
        `max-h-[${MASTER_PROMPT_CLAMP_MAX_PX}px]`,
        'shrink-0',
      ]),
    )
  })

  it('locks expanded height so character count cannot grow the box', () => {
    expect(MasterPromptFieldClass.FrameExpanded.split(' ')).toEqual(
      expect.arrayContaining([
        `h-[${MASTER_PROMPT_EXPAND_PX}px]`,
        `min-h-[${MASTER_PROMPT_EXPAND_PX}px]`,
        `max-h-[${MASTER_PROMPT_EXPAND_PX}px]`,
        'shrink-0',
      ]),
    )
  })

  it('draws the fade above the textarea over the last lines of text', () => {
    expect(MasterPromptFieldClass.Fade.split(' ')).toEqual(
      expect.arrayContaining([
        'bg-gradient-to-b',
        'from-transparent',
        'to-black/80',
        `h-[${MASTER_PROMPT_FADE_HEIGHT_PX}px]`,
        'z-[3]',
      ]),
    )
  })

  it('hides collapsed textarea glyphs so the preview fade is visible', () => {
    const collapsed = masterPromptBodyClassName({
      clamp: true,
      collapsedFill: true,
      expanded: false,
      filled: true,
      minRowsClassName: MasterPromptFieldClass.MinRowsDefault,
    })
    expect(collapsed.split(' ')).toEqual(expect.arrayContaining(['text-transparent']))
    expect(collapsed.split(' ')).not.toEqual(expect.arrayContaining(['text-foreground/85']))
  })
})
