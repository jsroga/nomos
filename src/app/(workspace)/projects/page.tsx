'use client'

import { TurbulentBackground } from '@/domains/marketing'
import { TURBULENT_BG_PROPS } from '@/shared/data/constants/visuals'
import { ProjectSelectionLayout } from '@/shared/workspace'

export default function ProjectSelectionPage() {
  return (
    <TurbulentBackground {...TURBULENT_BG_PROPS}>
      <ProjectSelectionLayout />
    </TurbulentBackground>
  )
}
