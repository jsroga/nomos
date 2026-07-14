import type { TourStep } from '@/shared/tours/tour-types'
import { ModuleIdKey, MODULE_ID_VALUES } from '@/shared/types/constants/onboarding'

export type ModuleId = `${ModuleIdKey}`

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
    [ModuleIdKey.Storyteller]: { completed: false, skipped: false },
    [ModuleIdKey.InteriorDesigner]: { completed: false, skipped: false },
    [ModuleIdKey.LoopCreator]: { completed: false, skipped: false },
    [ModuleIdKey.WorldGen]: { completed: false, skipped: false },
    [ModuleIdKey.AssetExporter]: { completed: false, skipped: false },
  },
  routes: {}, // Per-route onboarding state
}

const MODULE_IDS = new Set<string>(MODULE_ID_VALUES)

export function parseModuleId(value: unknown): ModuleId | null {
  const raw = typeof value === 'string' ? value : null
  if (!raw || !MODULE_IDS.has(raw)) return null
  for (const id of MODULE_ID_VALUES) {
    if (id === raw) return id
  }
  return null
}

export interface ModuleTourConfig {
  id: ModuleId
  name: string
  routeMatch: RegExp
  steps: TourStep[]
}
