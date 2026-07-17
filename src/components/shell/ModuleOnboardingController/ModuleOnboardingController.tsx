'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { User } from '@supabase/supabase-js'
import { TourAlertDialog, useTour } from '@/components/shell/Tour'
import { getModuleConfigByUrl } from '@/shared/tours/module-tours'
import { OnboardingAction } from '@/shared/types/constants/onboarding'
import {
  DocumentReadyStateValue,
  DomLifecycleEvent,
  ModuleOnboardingLog,
} from '@/components/shell/ModuleOnboardingController/constants/module-onboarding'
import { HttpMethod } from '@/shared/data/constants/protocol'
import {
  isForceOnboardingEnabled,
  scheduleTourOpen,
  shouldShowModuleTour,
} from './module-onboarding-helpers'

export function ModuleOnboardingController() {
  const pathname = usePathname()
  const supabase = createClientComponentClient()
  const { setSteps, startTour, endTour, currentStep, steps } = useTour()
  const [isOpen, setIsOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  const moduleConfig = useMemo(() => getModuleConfigByUrl(pathname), [pathname])

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user: loadedUser },
      } = await supabase.auth.getUser()
      setUser(loadedUser)
    }
    loadUser()
  }, [supabase.auth])

  const handleAction = useCallback(
    async (action: OnboardingAction) => {
      if (!user) return

      try {
        const res = await fetch('/api/users/onboarding', {
          method: HttpMethod.Post,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            moduleId: moduleConfig?.id,
            route: pathname,
            userId: user.id,
          }),
        })

        if (res.ok) {
          const data = await res.json()
          setUser(prev =>
            prev
              ? {
                  ...prev,
                  user_metadata: {
                    ...prev.user_metadata,
                    onboarding: data.onboarding,
                  },
                }
              : prev
          )
        }
      } catch (error) {
        console.error(ModuleOnboardingLog.UpdateFailed, error)
      }
    },
    [user, moduleConfig?.id, pathname]
  )

  useEffect(() => {
    if (!user || !pathname) return

    if (!moduleConfig) {
      endTour()
      return
    }

    const showTour = shouldShowModuleTour({
      onboarding: user.user_metadata?.onboarding,
      pathname,
      moduleId: moduleConfig.id,
      forceOnboarding: isForceOnboardingEnabled(),
    })

    if (showTour) {
      setSteps(moduleConfig.steps)
      const openDialog = () => {
        if (document.readyState === DocumentReadyStateValue.Complete) {
          setIsOpen(true)
        } else {
          window.addEventListener(DomLifecycleEvent.Load, () => setIsOpen(true), { once: true })
        }
      }
      return scheduleTourOpen(openDialog)
    }

    setSteps([])
    endTour()
  }, [user, pathname, moduleConfig, setSteps, endTour])

  useEffect(() => {
    if (currentStep >= 0 && currentStep === steps.length - 1 && !isForceOnboardingEnabled()) {
      queueMicrotask(() => {
        void handleAction(OnboardingAction.Complete)
      })
    }
  }, [currentStep, steps.length, handleAction])

  const handleStart = () => {
    startTour()
  }

  const handleSkip = () => {
    if (!isForceOnboardingEnabled()) {
      void handleAction(OnboardingAction.Skip)
    }
  }

  const handleSkipAll = () => {
    if (!isForceOnboardingEnabled()) {
      void handleAction(OnboardingAction.SkipAll)
    }
  }

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
