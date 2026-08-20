import { ContentType, HttpMethod, UrlScheme } from '@/shared/data/constants/protocol'
import { CanvasLineStyle } from '../ui/constants/repaint-canvas'
import {
  CanvasContextType,
  HtmlElementTag,
  ImageCrossOrigin,
} from './select-mode-service'

export enum HttpRequestHeader {
  ContentType = 'Content-Type',
}

export {
  ContentType,
  HttpMethod,
  UrlScheme,
  CanvasContextType,
  CanvasLineStyle,
  HtmlElementTag,
  ImageCrossOrigin,
}

export enum RepaintApiRoute {
  Repaint = '/api/repaint',
  Status = '/api/repaint/status',
}

export enum RepaintServiceLog {
  ApplyingRepaint = 'RepaintService: Applying repaint',
  AffectedTiles = 'Affected tiles:',
  ProcessingTile = 'Processing tile',
  SkippingTileNoOverlap = 'Skipping tile',
  CompositingOntoTile = 'Compositing onto tile',
  CouldNotLoadExistingTile = 'Could not load existing tile image, starting with blank',
  RepaintAppliedSuccessfully = 'RepaintService: Repaint applied successfully',
  UsingStyleReferences = 'RepaintService: Using style references',
  FinalBoundsWithExpansion = 'Final bounds with 50% expansion:',
  CallingServerSideApi = 'Calling server-side repaint API...',
}

export enum RepaintServiceError {
  NoProjectSelected = 'No project selected',
  FailedToCreateCanvas = 'Failed to create canvas',
  FailedToCreateMaskCanvas = 'Failed to create mask canvas',
  FailedToAcquireCanvasContext = 'Failed to acquire 2D canvas context for tile repaint',
  RepaintApiFailed = 'Repaint API failed',
  RepaintTriggerFailed = 'Failed to trigger repaint task',
  RepaintOutputMissing = 'Repaint run completed without an image',
}

export enum RepaintDefaultPrompt {
  SeamlessBlend = 'a detailed object matching the surrounding scene',
}

export enum RepaintTilePrompt {
  Repainted = 'repainted tile',
}

export enum RepaintMaskColor {
  Black = 'black',
  White = 'white',
}

export enum RepaintCanvasFill {
  NewTileGray = '#2a2a2a',
  ContextGray = '#808080',
}

export enum RepaintTileStatusLabel {
  Exists = 'exists',
  New = 'new',
}

export enum RepaintDataUrlPrefix {
  PngBase64 = 'data:image/png;base64,',
}

export enum RepaintImageMime {
  Png = 'image/png',
}

/** Soft edge in crop pixels so GPT fill blends into unpainted tiles. */
export const REPAINT_MASK_FEATHER_PX = 8

export enum RepaintCompositeOp {
  DestinationIn = 'destination-in',
}

export enum RepaintCanvasFilter {
  None = 'none',
}

export enum RepaintRgba {
  Red = 0,
  Green = 1,
  Blue = 2,
  Alpha = 3,
  Stride = 4,
}

export interface RepaintBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface RepaintResult {
  imageUrl: string
  bounds: RepaintBounds
  paintBounds: RepaintBounds
}

export function canvasBlurFilter(radiusPx: number): string {
  return `blur(${radiusPx}px)`
}

export enum RepaintOutputField {
  ImageBase64 = 'imageBase64',
}

export enum RepaintOperationId {
  Generate = 'repaint-generate',
}

export enum RepaintOperationLabel {
  Painting = 'Painting',
}

export enum RepaintOperationDetail {
  Inpaint = 'Inpaint',
}
