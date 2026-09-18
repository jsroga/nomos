import { describe, expect, it } from 'vitest'
import { stringArrayFromJson, recordFromJson } from '@/shared/data/json-guards'
import { DB_COLUMN } from '@/shared/data/constants/db-tables'

const STYLE_A = 'https://cdn.example/a.png'
const STYLE_B = 'https://cdn.example/b.png'
const STYLE_CANVAS = 'https://cdn.example/canvas.png'

describe('project style reference urls from jsonb', () => {
  it('reads storyteller_style_reference_urls without using the canvas list', () => {
    const row = recordFromJson({
      [DB_COLUMN.STORYTELLER_STYLE_REFERENCE_URLS]: [STYLE_A, STYLE_B],
      [DB_COLUMN.STYLE_REFERENCE_URLS]: [STYLE_CANVAS],
    })
    expect(stringArrayFromJson(row[DB_COLUMN.STORYTELLER_STYLE_REFERENCE_URLS])).toEqual([
      STYLE_A,
      STYLE_B,
    ])
    expect(stringArrayFromJson(row[DB_COLUMN.STYLE_REFERENCE_URLS])).toEqual([STYLE_CANVAS])
  })
})
