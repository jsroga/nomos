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
}

export enum RepaintDefaultPrompt {
  SeamlessBlend = 'High quality, detailed, seamless blend',
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
