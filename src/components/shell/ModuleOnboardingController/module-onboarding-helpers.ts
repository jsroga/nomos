import { OnboardingState, type ModuleId } from '@/shared/types/onboarding'
import { AuthBypassFlag } from '@/shared/data/constants/protocol'
import { LocalStorageKeys } from '@/shared/data/constants/localStorage'

export function isForceOnboardingEnabled(): boolean {
  return (
    typeof window !== 'undefined' &&
    localStorage.getItem(LocalStorageKeys.FORCE_ONBOARDING) === AuthBypassFlag.True
  )
}

function isRouteOnboardingDismissed(
  onboarding: OnboardingState,
  pathname: string
): boolean {
  const routeState = onboarding.routes[pathname]
  return Boolean(routeState?.completed || routeState?.skipped)
}

function isModuleOnboardingDismissed(
  onboarding: OnboardingState,
  moduleId: ModuleId
): boolean {
  const moduleState = onboarding.modules[moduleId]
  return Boolean(moduleState?.completed || moduleState?.skipped)
}

function isOnboardingDismissed(input: {
  onboarding: OnboardingState | undefined
  pathname: string
  moduleId: ModuleId
}): boolean {
  if (!input.onboarding) return false
  if (input.onboarding.skipAll) return true
  if (isRouteOnboardingDismissed(input.onboarding, input.pathname)) return true
  return isModuleOnboardingDismissed(input.onboarding, input.moduleId)
}

export function shouldShowModuleTour(input: {
  onboarding: OnboardingState | undefined
  pathname: string
  moduleId: ModuleId
  forceOnboarding: boolean
}): boolean {
  if (input.forceOnboarding) return true
  return !isOnboardingDismissed(input)
}

export function scheduleTourOpen(onOpen: () => void): () => void {
  const timer = setTimeout(onOpen, 1500)
  return () => clearTimeout(timer)
}
