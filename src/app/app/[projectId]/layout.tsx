import { GlobalSidebar } from '@/components/GlobalSidebar'
import { GlobalHeader } from '@/components/GlobalHeader'
import { ProjectLoader } from '@/components/ProjectLoader'

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-full w-full overflow-hidden">
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
    )
}
