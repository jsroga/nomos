import { ContentType, HttpMethod, UrlScheme } from '@/shared/data/constants/protocol'

export enum SegmentationProvider {
  Fal = 'fal',
  Replicate = 'replicate',
}

export enum HtmlElementTag {
  Canvas = 'canvas',
}

export enum CanvasContextType {
  TwoD = '2d',
}

export enum ImageCrossOrigin {
  Anonymous = 'Anonymous',
}

export enum SelectModeCanvasFill {
  DebugGray = '#808080',
}

export enum SelectModePixelSample {
  TopLeft = 'topLeft',
  TopRight = 'topRight',
  Center = 'center',
  BottomLeft = 'bottomLeft',
  BottomRight = 'bottomRight',
}

export enum SelectModeLogLabel {
  PixelBounds = 'Pixel bounds:',
  EffectiveTileSize = 'Effective tile size:',
}

export enum SelectModeLogMessage {
  CouldNotDetectTileResolution = '[SelectModeService] Could not detect tile resolution',
  DetectedMaxTileResolution = '[SelectModeService] Max tile resolution:',
  TileNotInStore = '[SelectModeService] Tile not found in store',
  FailedToLoadTile = '[SelectModeService] Failed to load tile',
  MosaicLayout = '[SelectModeService] Mosaic layout:',
  CanvasDimensions = '[SelectModeService] Canvas dimensions:',
  CanvasCreated = '[SelectModeService] Canvas created:',
  CanvasStateBeforeToDataUrl = '[SelectModeService] Canvas state before toDataURL:',
  DebugCanvasPixelSamples = '[DEBUG] Canvas pixel samples:',
  DebugContextImageStored = '[DEBUG] Context image stored at window.__DEBUG_CONTEXT_IMAGE__',
  DebugContextImageViewHint =
    '[DEBUG] To view: paste window.__DEBUG_CONTEXT_IMAGE__ in console, right-click the URL',
  Base64Validation = '[SelectModeService] Base64 validation:',
  Base64MalformedWarning = '[SelectModeService] WARNING: Base64 may be malformed!',
  ImageDetails = '[SelectModeService] Image details:',
  BoxTransformation = '[SelectModeService] Box transformation:',
  CallingApiWith = '[SelectModeService] Calling API with:',
  UsingSegmentationProvider = '[SelectModeService] Using segmentation provider:',
  GotCombinedMaskUrl = '[SelectModeService] Got combined_mask URL:',
  GotIndividualMasks = '[SelectModeService] Got individual_masks:',
  NoMasksInReplicateResponse = '[SelectModeService] No masks in Replicate response',
  RleDimensions = '[SelectModeService] RLE dimensions:',
  ResizingMaskToPixelBounds = '[SelectModeService] Resizing mask to match pixel bounds',
  NoRleMaskInResponse = '[SelectModeService] No RLE mask in response',
  ErrorDuringSegmentation = '[SelectModeService] Error during segmentation:',
  FetchingMaskFromUrl = '[SelectModeService] Fetching mask from URL:',
  ConvertedMaskToDataUrl = '[SelectModeService] Converted mask to data URL, length:',
  ErrorFindingBestMask = 'Error finding best mask:',
  ErrorResizingMask = 'Error resizing mask:',
  ExtractAsset = '[SelectModeService] extractAsset:',
  CropResult = '[SelectModeService] cropResult:',
}

export enum SelectModeErrorMessage {
  FailedToCreateCanvas = 'Failed to create canvas',
  FailedToCreateCanvasForMask = 'Failed to create canvas for mask',
  FailedToCreateCanvasForResizing = 'Failed to create canvas for resizing',
  FailedToCreateContextCanvas = 'Failed to create context canvas',
  FailedToCreateMaskCanvas = 'Failed to create mask canvas',
  FailedToCreateOutputCanvas = 'Failed to create output canvas',
}

export enum SelectModeApiRoute {
  Segment = '/api/ai/segment',
  FalSegment = '/api/ai/fal-segment',
  Enqueue = '/api/segment',
  Status = '/api/segment/status',
}

export enum SegmentOutputField {
  Rle = 'rle',
  Width = 'width',
  Height = 'height',
}

export enum HttpHeaderName {
  ContentType = 'Content-Type',
}

export { ContentType, HttpMethod, UrlScheme }

export const DATA_URL_PNG_PREFIX = `data:${ContentType.Png};base64,`
