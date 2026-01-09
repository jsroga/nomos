'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname, useParams } from 'next/navigation'
import { useTour, TourAlertDialog, TourStep } from '@/components/tour'
import { TOUR_STEP_IDS } from '@/lib/tour-constants'
import { useWorldStore } from '@/domains/world-building-toolkit/store/useWorldStore'
import { Sparkles, BookOpen, Map } from 'lucide-react'

/**
 * Onboarding Tour Component
 * 
 * 3-step flow:
 * 1. Click "Suggest idea" button (or we trigger it)
 * 2. Click "Generate world bible" button (or we trigger it)
 * 3. Click "World Gen" nav (or we redirect)
 * 
 * Stores completion status per-user.
 */

interface OnboardingTourProps {
    projectId?: string
}

export function OnboardingTour({ projectId }: OnboardingTourProps) {
    const router = useRouter()
    const pathname = usePathname()
    const params = useParams()
    const { setSteps, startTour, nextStep, setIsTourCompleted, isTourCompleted, currentStep } = useTour()
    const [open, setOpen] = useState(false)

    // Get user from store (set by AuthProvider)
    const user = useWorldStore(state => state.user)

    const effectiveProjectId = projectId || (params?.projectId as string)

    // Step 1: Trigger "Suggest idea" button click
    const triggerSuggestIdea = useCallback(() => {
        const btn = document.getElementById(TOUR_STEP_IDS.SUGGEST_IDEA_BUTTON)
        if (btn) {
            btn.click()
        }
        // Move to next step after a moment
        setTimeout(() => nextStep(), 400)
    }, [nextStep])

    // Step 2: Trigger "Generate world bible" button click
    const triggerGenerateBible = useCallback(() => {
        const btn = document.getElementById(TOUR_STEP_IDS.GENERATE_BIBLE_BUTTON)
        if (btn) {
            btn.click()
        }
        // Move to next step after a moment
        setTimeout(() => nextStep(), 400)
    }, [nextStep])

    // Step 3: Navigate to World Gen
    const navigateToWorldGen = useCallback(() => {
        if (effectiveProjectId) {
            router.push(`/app/${effectiveProjectId}/world-gen`)
        }
        // End tour after navigation
        setTimeout(() => {
            setIsTourCompleted(true)
        }, 500)
    }, [effectiveProjectId, router, setIsTourCompleted])

    // Define the 3 tour steps
    const createTourSteps = useCallback((): TourStep[] => [
        {
            content: (
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-primary font-semibold">
                        <Sparkles size={18} />
                        <span>Step 1: Get Inspired</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Click the highlighted <strong>&quot;Suggest idea&quot;</strong> button to get a creative
                        world prompt. Or click Next to auto-generate one for you!
                    </p>
                </div>
            ),
            selectorId: TOUR_STEP_IDS.SUGGEST_IDEA_BUTTON,
            position: 'bottom',
            onClickWithinArea: triggerSuggestIdea,
        },
        {
            content: (
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-primary font-semibold">
                        <BookOpen size={18} />
                        <span>Step 2: Generate World Bible</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Click the highlighted button to generate your World Bible with factions,
                        rules, and themes. Or click Next to trigger it!
                    </p>
                </div>
            ),
            selectorId: TOUR_STEP_IDS.GENERATE_BIBLE_BUTTON,
            position: 'bottom',
            onClickWithinArea: triggerGenerateBible,
        },
        {
            content: (
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-primary font-semibold">
                        <Map size={18} />
                        <span>Step 3: Explore World Gen</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Click World Gen in the sidebar to start creating your visual world map!
                        Or click Next to go there now.
                    </p>
                </div>
            ),
            selectorId: TOUR_STEP_IDS.WORLD_GEN_NAV,
            position: 'right',
            onClickWithinArea: navigateToWorldGen,
        },
    ], [triggerSuggestIdea, triggerGenerateBible, navigateToWorldGen])

    // Set tour steps on mount and when callbacks change
    useEffect(() => {
        setSteps(createTourSteps())
    }, [setSteps, createTourSteps])

    // Check if onboarding should be shown (user-level check)
    useEffect(() => {
        if (user && !user.user_metadata?.onboarding_completed) {
            const timer = setTimeout(() => setOpen(true), 800)
            return () => clearTimeout(timer)
        }
    }, [user])

    // Handle skip or complete - saves to user metadata
    const handleComplete = async () => {
        setIsTourCompleted(true)

        if (user?.id) {
            try {
                await fetch('/api/users/onboarding', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: user.id, completed: true })
                })

                // Update local user in store with new metadata
                useWorldStore.getState().setUser({
                    ...user,
                    user_metadata: {
                        ...user.user_metadata,
                        onboarding_completed: true
                    }
                })
            } catch (error) {
                console.error('Failed to mark onboarding as complete:', error)
            }
        }
    }

    // Custom start handler - redirect to storyteller first if not there
    const handleStartTour = () => {
        const isOnStoryteller = pathname?.includes('/storyteller')

        if (!isOnStoryteller && effectiveProjectId) {
            // Redirect to storyteller first
            router.push(`/app/${effectiveProjectId}/storyteller`)
        }

        setOpen(false)
        // Start tour after a brief delay to allow navigation/render
        setTimeout(() => {
            startTour()
        }, isOnStoryteller ? 100 : 600)
    }

    // Handle the dialog closing (skip)
    const handleSkip = async () => {
        setOpen(false)
        await handleComplete()
    }

    // If tour completed or no user, don't render
    if (isTourCompleted || !user) {
        return null
    }

    return (
        <TourAlertDialog
            isOpen={open}
            setIsOpen={(isOpen) => {
                if (!isOpen) {
                    handleSkip()
                } else {
                    setOpen(true)
                }
            }}
            onStartTour={handleStartTour}
        />
    )
}
