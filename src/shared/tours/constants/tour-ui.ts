/** Tour provider DOM events and UI copy. */

export enum TourDomEvent {
  Resize = 'resize',
  Scroll = 'scroll',
  Click = 'click',
}

export enum TourSelectorId {
  Body = 'body',
}

export const TOUR_HOOK_ERROR = 'useTour must be used within a TourProvider'

export const TOUR_DEFAULT_MODULE_NAME = 'Application'
