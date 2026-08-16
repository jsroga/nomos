import { describe, expect, it } from 'vitest'
import {
  pendingReviewHostClass,
  SectionPendingOverlayClass,
} from '../section-pending-overlay'

describe('pendingReviewHostClass', () => {
  it('applies review min-height only while pending', () => {
    expect(pendingReviewHostClass(true)).toBe(
      `${SectionPendingOverlayClass.HostRelative} ${SectionPendingOverlayClass.MinHeight}`
    )
  })

  it('keeps the host relative while loading without review', () => {
    expect(pendingReviewHostClass(false, true)).toBe(SectionPendingOverlayClass.HostRelative)
  })

  it('leaves idle hosts unstyled', () => {
    expect(pendingReviewHostClass(false)).toBe('')
  })
})
