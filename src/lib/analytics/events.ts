// Analytics event definitions
// Centralized place to define all trackable events

export const AnalyticsEvents = {
  // Landing page events
  LANDING_PAGE_VIEW: 'landing_page_viewed',
  CTA_CLICKED: 'cta_clicked',
  DEMO_VIDEO_STARTED: 'demo_video_started',
  EMAIL_SUBMITTED: 'email_submitted',

  // Onboarding events
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_STEP_COMPLETED: 'onboarding_step_completed',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  ONBOARDING_SKIPPED: 'onboarding_skipped',

  // Feature usage events
  WORLD_GENERATED: 'world_generated',
  TERRAIN_SCULPTED: 'terrain_sculpted',
  NARRATIVE_CREATED: 'narrative_created',
  ASSET_EXPORTED: 'asset_exported',
  LOOP_DESIGNED: 'loop_designed',

  // Session events
  SESSION_STARTED: 'session_started',
  SESSION_ENDED: 'session_ended',

  // Error events
  ERROR_OCCURRED: 'error_occurred',
  API_ERROR: 'api_error',
} as const

export type AnalyticsEventName = (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents]

// Event property types for type safety
export interface EventProperties {
  [AnalyticsEvents.CTA_CLICKED]: {
    button_text: string
    location: 'hero' | 'nav' | 'footer' | 'section'
  }
  [AnalyticsEvents.EMAIL_SUBMITTED]: {
    location: 'landing' | 'modal' | 'footer'
  }
  [AnalyticsEvents.WORLD_GENERATED]: {
    world_type: string
    generation_time_ms: number
  }
  // Add more event property types as needed
}
