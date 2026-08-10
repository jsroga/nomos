import { FetchCache, HttpMethod } from '@/shared/data/constants/protocol'

export { FetchCache, HttpMethod }

export enum WorldDataStoreKey {
  Tiles = 'tiles',
  Assets = 'assets',
  LoadTilesForProject = 'loadTilesForProject',
  ClearTiles = 'clearTiles',
  AddTile = 'addTile',
  RemoveTile = 'removeTile',
  GetTile = 'getTile',
  SetAssets = 'setAssets',
  AddAsset = 'addAsset',
  UpdateAsset = 'updateAsset',
  RemoveAsset = 'removeAsset',
  FetchAssets = 'fetchAssets',
  AcceptUpscale = 'acceptUpscale',
  AcceptGeneration = 'acceptGeneration',
  AcceptFidelity = 'acceptFidelity',
}

export enum WorldDataStoreLog {
  ApiErrorLoadingProject = 'API error loading project:',
  FailedToLoadProjectViaApi = 'Failed to load project via API:',
  FailedToDeleteImageFile = 'Failed to delete image file:',
  ErrorFetchingAssets = 'Error fetching assets:',
}

export enum WorldDataStoreError {
  FailedToSaveImage = 'Failed to save image',
  FailedToAcceptUpscale = 'Failed to accept upscale',
  InvalidDataUrl = 'Invalid data URL',
  FileReaderError = 'FileReader error',
}

export enum WorldDataApiRoute {
  StorytellerProject = '/api/storyteller/projects/',
  SaveImage = '/api/save-image',
  DeleteImage = '/api/delete-image',
  AcceptUpscale = '/api/tiles/accept-upscale',
}

export enum FetchRequestHeader {
  CacheControl = 'Cache-Control',
  ContentType = 'Content-Type',
}

export enum FetchCacheControl {
  NoCache = 'no-cache',
}

export const WORLD_DATA_STORE_KEYS: readonly WorldDataStoreKey[] = Object.values(WorldDataStoreKey)
