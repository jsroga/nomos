import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CharacterDialogFieldClass } from '../constants/character-creation-dialog'

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
