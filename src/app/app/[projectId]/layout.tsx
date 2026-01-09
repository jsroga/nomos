import { GlobalSidebar } from '@/components/GlobalSidebar'
import { GlobalHeader } from '@/components/GlobalHeader'
import { ProjectLoader } from '@/components/ProjectLoader'
import { ProjectTourWrapper } from '@/components/ProjectTourWrapper'

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
    return (
        <ProjectTourWrapper>
            <div className="flex h-full w-full overflow-hidden pointer-events-auto relative z-10">
                <GlobalSidebar />
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                    <GlobalHeader />
                    <div className="flex-1 overflow-hidden relative">
                        <ProjectLoader>
                            {children}
                        </ProjectLoader>
                    </div>
                </div>
            </div>
        </ProjectTourWrapper>
    )
}

