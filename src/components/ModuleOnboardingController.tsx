'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { TourAlertDialog, useTour } from './tour'
import { getModuleConfigByUrl } from '@/lib/module-tours'
import { OnboardingState, ModuleId } from '@/types/onboarding'
import { LocalStorageKeys } from '@/constants/localStorage'

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
      localStorage.getItem(LocalStorageKeys.FORCE_ONBOARDING) === 'true'

    const isSkippedAll = onboarding?.skipAll
    const isModuleCompleted = onboarding?.modules?.[config.id as ModuleId]?.completed
    const isModuleSkipped = onboarding?.modules?.[config.id as ModuleId]?.skipped

    if (forceOnboarding || (!isSkippedAll && !isModuleCompleted && !isModuleSkipped)) {
      setSteps(config.steps)
      // Delay slightly to ensure UI is ready
      const timer = setTimeout(() => setIsOpen(true), 1000)
      return () => clearTimeout(timer)
    } else {
      setSteps([])
      endTour()
    }
  }, [user, pathname, setSteps, endTour])

  const handleAction = useCallback(
    async (action: 'complete' | 'skip' | 'skipAll') => {
      if (!user) return

      const moduleId = moduleConfig?.id

      try {
        const res = await fetch('/api/users/onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            moduleId,
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
        console.error('Failed to update onboarding status:', error)
      }
    },
    [user, moduleConfig?.id]
  )

  const handleStart = () => {
    startTour()
  }

  const handleSkip = () => {
    handleAction('skip')
  }

  const handleSkipAll = () => {
    handleAction('skipAll')
  }

  // Effect to detect tour completion
  const { currentStep, steps } = useTour()
  useEffect(() => {
    if (currentStep >= 0 && currentStep === steps.length - 1) {
      // When user reaches the last step, mark as complete
      handleAction('complete')
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
