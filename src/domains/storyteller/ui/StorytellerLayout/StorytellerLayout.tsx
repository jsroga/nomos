'use client'

import { useStorytellerPage } from '@/domains/storyteller/state/hooks/useStorytellerPage'
import { StorytellerWorkspace } from './StorytellerWorkspace'

export function StorytellerLayout() {
  const slices = useStorytellerPage()
  return <StorytellerWorkspace {...slices} />
}
