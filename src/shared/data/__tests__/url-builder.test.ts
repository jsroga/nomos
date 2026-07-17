import { describe, expect, it } from 'vitest'
import { buildUrl, joinUrlPath, appendQueryParams, cloneSearchParams, buildPathWithSearchParams, buildQueryString, encodePathSegment } from '@/shared/data/url-builder'


describe('url-builder', () => {
  it('encodePathSegment encodes reserved characters', () => {
    expect(encodePathSegment('a/b?c')).toBe('a%2Fb%3Fc')
  })

  it('joinUrlPath joins and encodes segments', () => {
    expect(joinUrlPath('/api/storyteller/episodes', 'ep-1', 'beats')).toBe(
      '/api/storyteller/episodes/ep-1/beats'
    )
    expect(joinUrlPath('/api/storyteller/beats', 'beat id', 'generate-image')).toBe(
      '/api/storyteller/beats/beat%20id/generate-image'
    )
  })

  it('buildUrl appends query params', () => {
    expect(buildUrl('/api/entities', { projectId: 'p1', search: undefined })).toBe(
      '/api/entities?projectId=p1'
    )
  })

  it('appendQueryParams merges with existing query', () => {
    expect(
      appendQueryParams('/api/entities/resolve?projectId=p1', {
        ids: 'a,b',
        enrichRelationships: true,
      })
    ).toBe('/api/entities/resolve?projectId=p1&ids=a%2Cb&enrichRelationships=true')
  })

  it('buildQueryString omits nullish values', () => {
    expect(buildQueryString({ a: '1', b: null, c: undefined })).toBe('a=1')
  })

  it('cloneSearchParams clones from string', () => {
    const params = cloneSearchParams('a=1&b=2')
    params.set('c', '3')
    expect(params.toString()).toBe('a=1&b=2&c=3')
  })

  it('buildPathWithSearchParams handles empty query', () => {
    expect(buildPathWithSearchParams('/storyteller', new URLSearchParams())).toBe('/storyteller')
    expect(buildPathWithSearchParams('/storyteller', new URLSearchParams('tab=bible'))).toBe(
      '/storyteller?tab=bible'
    )
  })
})
