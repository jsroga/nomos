import { GlobalSidebar } from '@/components/shell/GlobalSidebar'
import { GlobalHeader } from '@/components/shell/GlobalHeader'
import { ProjectLoader } from '@/components/shell/ProjectLoader'
import { ProjectTourWrapper } from '@/components/shell/ProjectTourWrapper'

import { TooltipProvider } from '@/components/Tooltip'
import { WORKSPACE_PAGE_TITLE } from '@/shared/data/constants/route-metadata'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: WORKSPACE_PAGE_TITLE.PROJECT,
}

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={0}>
      <ProjectTourWrapper>
        <div className="flex h-full w-full overflow-hidden pointer-events-auto relative z-10">
          <GlobalSidebar />
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <GlobalHeader />
            <div className="flex-1 overflow-hidden relative">
              <ProjectLoader>{children}</ProjectLoader>
            </div>
          </div>
        </div>
      </ProjectTourWrapper>
    </TooltipProvider>
  )
}
