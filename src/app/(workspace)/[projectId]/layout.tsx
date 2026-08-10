import { connection } from 'next/server'
import { GlobalSidebar } from '@/components/shell/GlobalSidebar'
import { GlobalHeader } from '@/components/shell/GlobalHeader'
import { ProjectLoader } from '@/components/shell/ProjectLoader'
import { ProjectTourWrapper } from '@/components/shell/ProjectTourWrapper'

import { TooltipProvider } from '@/components/Tooltip'
import { WORKSPACE_PAGE_TITLE } from '@/shared/data/constants/route-metadata'
import type { Metadata } from 'next'

enum ProjectShellParam {
  Id = '__shell__',
  Key = 'projectId',
}

/** Cache Components requires ≥1 static param to build an App Shell. */
export function generateStaticParams() {
  return [{ [ProjectShellParam.Key]: ProjectShellParam.Id }]
}

/** Session-bound project chrome — defer instant-navigation validation. */
export const instant = false

export const metadata: Metadata = {
  title: WORKSPACE_PAGE_TITLE.PROJECT,
}

export default async function ProjectLayout({ children }: { children: React.ReactNode }) {
  // Request-time only — client project chrome is not a static App Shell.
  await connection()

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
