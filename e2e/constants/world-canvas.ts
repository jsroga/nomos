/** Wire values for Infinite Canvas Playwright stubs. */

export enum WorldCanvasTest {
  Describe = 'Infinite Canvas',
  AcceptNeighbor = 'generate, Upscale 4× nowrap, Accept does not paint neighbor',
  Credits402 = 'generate 402 shows error and does not paint a tile',
  NavigateAway = 'in-progress generate survives storyteller navigation',
}

export enum WorldCanvasPrompt {
  Origin = 'rain-soaked alley',
}

export enum WorldCanvasRoute {
  Trigger = '**/api/trigger-tile',
  Status = '**/api/trigger-tile/status**',
}

export enum WorldCanvasRunId {
  Complete = 'e2e-tile-complete',
  Busy = 'e2e-tile-busy',
}

export enum WorldCanvasTileUrl {
  Stub = 'https://example.com/e2e-tile.png',
}

export enum WorldCanvasStatus {
  Completed = 'COMPLETED',
  Executing = 'EXECUTING',
}

export enum WorldCanvasHttp {
  PaymentRequired = 402,
}

export enum WorldCanvasError {
  TriggerFailed = 'Request failed with status 402',
}

export enum WorldCanvasAlt {
  Origin = 'Tile at 0,0',
  East = 'Tile at 1,0',
}

export enum WorldCanvasCoord {
  Origin = '0,0',
}

export enum WorldCanvasJson {
  ContentType = 'application/json',
}

export const WORLD_CANVAS_UPSCALE_MAX_HEIGHT_PX = 40
export const WORLD_CANVAS_TRIGGER_MAX = 2
export const WORLD_CANVAS_TRIGGER_MIN = 1
