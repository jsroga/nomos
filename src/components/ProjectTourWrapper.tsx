import { TourProvider } from '@/components/tour'
import { ModuleOnboardingController } from '@/components/ModuleOnboardingController'

interface ProjectTourWrapperProps {
  children: React.ReactNode
  projectId?: string
}

/**
 * Client wrapper that provides TourProvider context at the project level.
 * This enables the onboarding tour to appear on any page within the project.
 */
export function ProjectTourWrapper({ children }: ProjectTourWrapperProps) {
  return (
    <TourProvider>
      <ModuleOnboardingController />
      {children}
    </TourProvider>
  )
}
