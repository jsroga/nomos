'use client'

import { TourProvider } from '@/components/tour'
import { OnboardingTour } from '@/components/OnboardingTour'

interface ProjectTourWrapperProps {
    children: React.ReactNode
    projectId?: string
}

/**
 * Client wrapper that provides TourProvider context at the project level.
 * This enables the onboarding tour to appear on any page within the project.
 */
export function ProjectTourWrapper({ children, projectId }: ProjectTourWrapperProps) {
    return (
        <TourProvider>
            <OnboardingTour projectId={projectId} />
            {children}
        </TourProvider>
    )
}
