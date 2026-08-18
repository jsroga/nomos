import { describe, expect, it } from 'vitest'
import { isApiframeImageFilterDenial } from '../apiframe'
import { ApiframeErrorMessage, ApiframeJobErrorMatch } from '../constants/apiframe'

describe('isApiframeImageFilterDenial', () => {
  it('matches the Apiframe image-filter cancel message', () => {
    const message = `${ApiframeErrorMessage.JobFailed}: [${ApiframeJobErrorMatch.ImageDenied}] ${ApiframeJobErrorMatch.ImageFilters}`
    expect(isApiframeImageFilterDenial(message)).toBe(true)
  })

  it('ignores unrelated Apiframe failures', () => {
    expect(isApiframeImageFilterDenial(ApiframeErrorMessage.NoImages)).toBe(false)
    expect(isApiframeImageFilterDenial(ApiframeErrorMessage.TaskTimedOut)).toBe(false)
  })
})
