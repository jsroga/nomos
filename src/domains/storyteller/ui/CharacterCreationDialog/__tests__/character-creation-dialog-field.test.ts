import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  CharacterDialogFieldClass,
  CharacterDialogOverlayClass,
  CharacterDialogPsychologyClass,
  CharacterDialogPsychologyCopy,
} from '../constants/character-creation-dialog'
import { CharacterDialogSelectClass } from '../CharacterDialogSelect'

describe('CharacterCreationDialogField refresh control', () => {
  it('shows RefreshCw on hover and focus-visible', () => {
    const src = readFileSync(
      'src/domains/storyteller/ui/CharacterCreationDialog/CharacterCreationDialogField.tsx',
      'utf8',
    )
    expect(src).toContain('RefreshCw')
    expect(src).toContain('CharacterDialogFieldClass.Refresh')
    expect(CharacterDialogFieldClass.Refresh).toContain('group-hover:opacity-100')
    expect(CharacterDialogFieldClass.Refresh).toContain('focus-visible:opacity-100')
  })
})

describe('CharacterCreationDialog Select stacking', () => {
  it('opens the menu above the overlay without modal pointer lock', () => {
    const src = readFileSync(
      'src/domains/storyteller/ui/CharacterCreationDialog/CharacterDialogSelect.tsx',
      'utf8',
    )
    expect(src).toContain('modal={false}')
    expect(src).toContain('CharacterDialogSelectClass.Menu')
    expect(CharacterDialogSelectClass.Menu).toContain('z-[10050]')
    expect(CharacterDialogOverlayClass.Backdrop).toContain('z-[9999]')
  })
})

describe('CharacterCreationDialog psychology accordion', () => {
  it('keeps Character Psychology collapsed and hosts MBTI inside it', () => {
    const psychology = readFileSync(
      'src/domains/storyteller/ui/CharacterCreationDialog/CharacterCreationDialogPsychologyFields.tsx',
      'utf8',
    )
    const basic = readFileSync(
      'src/domains/storyteller/ui/CharacterCreationDialog/CharacterCreationDialogBasicFields.tsx',
      'utf8',
    )
    expect(psychology).toContain('<details')
    expect(psychology).not.toContain('open=')
    expect(psychology).toContain('CharacterDialogFieldLabel.Mbti')
    expect(psychology).toContain('CharacterDialogPsychologyCopy.Title')
    expect(psychology).toContain('panel.open = true')
    expect(basic).not.toContain('Mbti')
    expect(CharacterDialogPsychologyCopy.Title).toBe('Character Psychology')
    expect(CharacterDialogPsychologyClass.Root).toContain('group')
    const dialog = readFileSync(
      'src/domains/storyteller/ui/CharacterCreationDialog/CharacterCreationDialog.tsx',
      'utf8',
    )
    expect(dialog).toContain('CharacterCreationDialogMetricsFields')
    expect(dialog).toMatch(
      /<CharacterCreationDialogPsychologyFields[\s\S]*<CharacterCreationDialogMetricsFields[\s\S]*<\/CharacterCreationDialogPsychologyFields>/,
    )
  })
})
