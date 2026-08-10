import { DomEventType, KeyboardKey } from '@/shared/data/constants/protocol'
import { WorldGenReviewType } from './world-gen-page'

export { DomEventType, KeyboardKey, WorldGenReviewType }

export type TileReviewType = WorldGenReviewType

export enum TileReviewDomEvent {
  MouseMove = 'mousemove',
  MouseUp = 'mouseup',
  TouchMove = 'touchmove',
  TouchEnd = 'touchend',
}

export enum VariantSelectionAction {
  Accept = 'accept',
  Upscale = 'upscale',
}

export enum TileReviewTypeLabel {
  Generated = 'Generated',
  Enhanced = 'Enhanced',
  Upscaled = 'Upscaled',
}

export enum TileReviewAcceptLabel {
  Generation = 'Accept Generation',
  Enhancement = 'Accept Enhancement',
  Upscale = 'Accept Upscale',
}

export enum TileReviewToast {
  SelectVariantFirst = 'Select a variant before accepting.',
  UsingSelectedVariant = 'Using selected variant...',
  GenerationAccepted = 'Generation accepted!',
  EnhancementAccepted = 'Enhancement accepted!',
  UpscaleAccepted = 'Upscale accepted!',
  CouldNotDetermineVariantIndex = 'Could not determine variant index',
  UpscalingVariant = 'Upscaling variant...',
  GenerationRejected = 'Generation rejected',
  EnhancementRejected = 'Enhancement rejected',
  UpscaleRejected = 'Upscale rejected',
}

export enum TileReviewLog {
  ComparisonSliderUrls = '[ComparisonSlider] URLs:',
  OriginalLoaded = '[ComparisonSlider] Original loaded successfully',
  OriginalFailed = '[ComparisonSlider] Original image failed to load:',
  NewLoaded = '[ComparisonSlider] New image loaded successfully',
  NewFailed = '[ComparisonSlider] New image failed to load:',
}

export const TILE_REVIEW_INFO_TOAST_ICON = 'ℹ️'
