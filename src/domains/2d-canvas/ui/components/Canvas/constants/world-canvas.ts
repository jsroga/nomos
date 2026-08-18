import { DomEventType, DomTagName, KeyboardKey } from '@/shared/data/constants/protocol'

export const WORLD_CANVAS_API_CALLING_STATUS = 'Calling API...'
export const WORLD_CANVAS_SEGMENTATION_FAILED_LOG = 'Segmentation failed:'
export const WORLD_CANVAS_APPLY_REPAINT_FAILED_LOG = 'Apply repaint failed:'
export const WORLD_CANVAS_ORIGIN_TILE_COORD = '0,0'

export { DomEventType as WorldCanvasDomEvent, DomTagName as WorldCanvasDomTag, KeyboardKey as WorldCanvasKey }

export enum WorldCanvasWindowEvent {
  KeyUp = 'keyup',
}

export enum WorldCanvasToolShortcut {
  Pan = 'v',
  Select = 's',
  Paint = 'b',
  Space = ' ',
}

export enum WorldCanvasCursor {
  Grab = 'grab',
  Grabbing = 'grabbing',
  Crosshair = 'crosshair',
}
