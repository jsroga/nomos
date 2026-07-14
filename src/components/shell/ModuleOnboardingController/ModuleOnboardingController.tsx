'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { TourAlertDialog, useTour } from '@/components/shell/Tour'
import { getModuleConfigByUrl } from '@/shared/tours/module-tours'
import { OnboardingState } from '@/shared/types/onboarding'
import { LocalStorageKeys } from '@/shared/data/constants/localStorage'
import {
  OnboardingAction,
} from '@/shared/types/constants/onboarding'
import {
  DocumentReadyStateValue,
  DomLifecycleEvent,
  ModuleOnboardingLog,
} from '@/components/shell/ModuleOnboardingController/constants/module-onboarding'
import { AuthBypassFlag, HttpMethod } from '@/shared/data/constants/protocol'

export function ModuleOnboardingController() {
  const pathname = usePathname()
  const supabase = createClientComponentClient()
  const { setSteps, startTour, endTour } = useTour()
  const [isOpen, setIsOpen] = useState(false)
  const [moduleConfig, setModuleConfig] =
    useState<ReturnType<typeof getModuleConfigByUrl>>(undefined)
  const [user, setUser] = useState<any>(null)

  // Load user and check onboarding status
  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
    }
    loadUser()
  }, [supabase.auth])

  // Determine current module and show tour if needed
  useEffect(() => {
    if (!user || !pathname) return

    const config = getModuleConfigByUrl(pathname)
    setModuleConfig(config)

    if (!config) {
      endTour()
      return
    }

    const onboarding: OnboardingState | undefined = user.user_metadata?.onboarding
    const forceOnboarding =
      typeof window !== 'undefined' &&
      localStorage.getItem(LocalStorageKeys.FORCE_ONBOARDING) === AuthBypassFlag.True

    const isSkippedAll = onboarding?.skipAll
    
    // Check per-route onboarding state first (preferred)
    const routeState = onboarding?.routes?.[pathname]
    const isRouteCompleted = routeState?.completed
    const isRouteSkipped = routeState?.skipped
    
    // Fallback to per-module state for backward compatibility
    const isModuleCompleted = onboarding?.modules?.[config.id]?.completed
    const isModuleSkipped = onboarding?.modules?.[config.id]?.skipped

    // In debug mode: ignore skip/finish state, always show on refresh (but still respect skip/finish actions during session)
    // In normal mode: respect skip/finish state
    const shouldShowTour = forceOnboarding 
      ? true // Debug mode: always show on refresh
      : (!isSkippedAll && 
         !isRouteCompleted && 
         !isRouteSkipped && 
         !isModuleCompleted && 
         !isModuleSkipped)

    if (shouldShowTour) {
      setSteps(config.steps)
      // Wait for everything to load before showing popup
      const timer = setTimeout(() => {
        // Double-check that DOM is ready and elements exist
        if (document.readyState === DocumentReadyStateValue.Complete) {
          setIsOpen(true)
        } else {
          window.addEventListener(DomLifecycleEvent.Load, () => setIsOpen(true), { once: true })
        }
      }, 1500)
      return () => clearTimeout(timer)
    } else {
      setSteps([])
      endTour()
    }
  }, [user, pathname, setSteps, endTour])

  const handleAction = useCallback(
    async (action: OnboardingAction) => {
      if (!user) return

      const moduleId = moduleConfig?.id

      try {
        const res = await fetch('/api/users/onboarding', {
          method: HttpMethod.Post,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            moduleId,
            route: pathname, // Send route for per-route tracking
            userId: user.id,
          }),
        })

        if (res.ok) {
          const data = await res.json()
          // Update local user state to reflect changes without page reload
          setUser((prev: any) => ({
            ...prev,
            user_metadata: {
              ...prev.user_metadata,
              onboarding: data.onboarding,
            },
          }))
        }
      } catch (error) {
        console.error(ModuleOnboardingLog.UpdateFailed, error)
      }
    },
    [user, moduleConfig?.id, pathname]
  )

  const handleStart = () => {
    startTour()
  }

  const handleSkip = () => {
    const forceOnboarding =
      typeof window !== 'undefined' &&
      localStorage.getItem(LocalStorageKeys.FORCE_ONBOARDING) === AuthBypassFlag.True
    
    // In debug mode: don't persist skip to user metadata (will reappear on refresh)
    // In normal mode: persist skip (normal user functionality)
    if (!forceOnboarding) {
      handleAction(OnboardingAction.Skip)
    }
  }

  const handleSkipAll = () => {
    const forceOnboarding =
      typeof window !== 'undefined' &&
      localStorage.getItem(LocalStorageKeys.FORCE_ONBOARDING) === AuthBypassFlag.True
    
    // In debug mode: don't persist skipAll to user metadata (will reappear on refresh)
    // In normal mode: persist skipAll (normal user functionality)
    if (!forceOnboarding) {
      handleAction(OnboardingAction.SkipAll)
    }
  }

  // Effect to detect tour completion
  const { currentStep, steps } = useTour()
  useEffect(() => {
    if (currentStep >= 0 && currentStep === steps.length - 1) {
      const forceOnboarding =
        typeof window !== 'undefined' &&
        localStorage.getItem(LocalStorageKeys.FORCE_ONBOARDING) === AuthBypassFlag.True
      
      // In debug mode: don't persist completion to user metadata (will reappear on refresh)
      // In normal mode: persist completion (normal user functionality)
      if (!forceOnboarding) {
        handleAction(OnboardingAction.Complete)
      }
    }
  }, [currentStep, steps.length, handleAction])


  if (!moduleConfig) return null

  return (
    <TourAlertDialog
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      onStartTour={handleStart}
      onSkip={handleSkip}
      onSkipAll={handleSkipAll}
      moduleName={moduleConfig.name}
    />
  )
}
