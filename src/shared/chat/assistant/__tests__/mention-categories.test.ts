import { describe, it, expect } from 'vitest'
import { toMentionCategories } from '../mention-categories'
import { MentionCategoryId, MentionCategoryLabel } from '@/shared/chat/core/constants/mention-types'
import type { MentionItem } from '@/shared/chat/core/mentions/types'

const items: MentionItem[] = [
  { id: 'c1', name: 'Vera', category: `${MentionCategoryId.Entity}`, type: 'character', icon: 'User', preview: 'the forger' },
  { id: 'a1', name: 'Writer', category: `${MentionCategoryId.Agent}`, type: 'writer' },
  { id: 'c2', name: 'Marcus', category: `${MentionCategoryId.Entity}`, type: 'character' },
]

describe('toMentionCategories', () => {
  it('groups items by category in catalog order and maps fields', () => {
    const categories = toMentionCategories(items)
    expect(categories.map(c => c.id)).toEqual([MentionCategoryId.Entity, MentionCategoryId.Agent])

    const entities = categories[0]
    expect(entities.label).toBe(MentionCategoryLabel.Entities)
    expect(entities.items.map(m => m.id)).toEqual(['c1', 'c2'])
    expect(entities.items[0]).toMatchObject({
      id: 'c1',
      label: 'Vera',
      type: 'character',
      icon: 'User',
      description: 'the forger',
    })
  })

  it('omits optional fields when absent and drops empty categories', () => {
    const categories = toMentionCategories(items)
    // no Section items → not present
    expect(categories.find(c => c.id === MentionCategoryId.Section)).toBeUndefined()
    // Marcus has no preview/icon → no description/icon keys
    const marcus = categories[0].items[1]
    expect(marcus).not.toHaveProperty('description')
    expect(marcus).not.toHaveProperty('icon')
  })

  it('returns empty for no items', () => {
    expect(toMentionCategories([])).toEqual([])
  })
})
