import { FetchCache, HttpMethod } from '@/shared/data/constants/protocol'

export { FetchCache, HttpMethod }

export enum WorldDataStoreKey {
  User = 'user',
  CurrentProject = 'currentProject',
  Projects = 'projects',
  Tiles = 'tiles',
  Assets = 'assets',
  SetUser = 'setUser',
  LoadProject = 'loadProject',
  FetchAllProjects = 'fetchAllProjects',
  CreateProject = 'createProject',
  DeleteProject = 'deleteProject',
  SwitchProject = 'switchProject',
  AddTile = 'addTile',
  RemoveTile = 'removeTile',
  GetTile = 'getTile',
  SetAssets = 'setAssets',
  AddAsset = 'addAsset',
  UpdateAsset = 'updateAsset',
  RemoveAsset = 'removeAsset',
  FetchAssets = 'fetchAssets',
  SetCurrentProject = 'setCurrentProject',
  AcceptUpscale = 'acceptUpscale',
  AcceptGeneration = 'acceptGeneration',
  AcceptFidelity = 'acceptFidelity',
}

export enum WorldDataStoreLog {
  ApiErrorLoadingProject = 'API error loading project:',
  FailedToLoadProjectViaApi = 'Failed to load project via API:',
  ErrorFetchingProjects = 'Error fetching projects:',
  ErrorCreatingProject = 'Error creating project:',
  ErrorDeletingProject = 'Error deleting project:',
  FailedToDeleteImageFile = 'Failed to delete image file:',
  ErrorFetchingAssets = 'Error fetching assets:',
}

export enum WorldDataStoreError {
  FailedToSaveImage = 'Failed to save image',
  FailedToAcceptUpscale = 'Failed to accept upscale',
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
