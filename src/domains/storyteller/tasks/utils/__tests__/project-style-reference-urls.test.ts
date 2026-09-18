import { describe, expect, it } from 'vitest'
import { stringArrayFromJson, recordFromJson } from '@/shared/data/json-guards'
import { DB_COLUMN } from '@/shared/data/constants/db-tables'

const STYLE_A = 'https://cdn.example/a.png'
const STYLE_B = 'https://cdn.example/b.png'

describe('project style reference urls from jsonb', () => {
  it('reads style_reference_urls off a project row', () => {
    const row = recordFromJson({ [DB_COLUMN.STYLE_REFERENCE_URLS]: [STYLE_A, STYLE_B] })
    expect(stringArrayFromJson(row[DB_COLUMN.STYLE_REFERENCE_URLS])).toEqual([STYLE_A, STYLE_B])
  })
})
