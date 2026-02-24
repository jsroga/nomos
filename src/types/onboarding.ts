import { TourStep } from '@/components/tour'

export type ModuleId =
  | 'storyteller'
  | 'interior-designer'
  | 'loop-creator'
  | 'world-gen'
  | 'asset-exporter'

export interface ModuleOnboardingState {
  completed: boolean
  skipped: boolean
}

export interface OnboardingState {
  skipAll: boolean
  modules: Record<ModuleId, ModuleOnboardingState> // Legacy: kept for backward compatibility
  routes: Record<string, ModuleOnboardingState> // New: per-route tracking (pathname as key)
}

export const DEFAULT_ONBOARDING_STATE: OnboardingState = {
  skipAll: false,
  modules: {
    storyteller: { completed: false, skipped: false },
    'interior-designer': { completed: false, skipped: false },
    'loop-creator': { completed: false, skipped: false },
    'world-gen': { completed: false, skipped: false },
    'asset-exporter': { completed: false, skipped: false },
  },
  routes: {}, // Per-route onboarding state
}

export interface ModuleTourConfig {
  id: ModuleId
  name: string
  routeMatch: RegExp
  steps: TourStep[]
}
