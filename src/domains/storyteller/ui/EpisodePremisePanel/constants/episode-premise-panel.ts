import { HttpMethod, UrlScheme } from '@/shared/data/constants/protocol'

export { HttpMethod as EpisodePremiseHttpMethod, UrlScheme as EpisodePremiseUrlScheme }

export const EPISODE_PREMISE_SAVE_POSTER_PATH = '/api/storyteller/save-episode-poster-variant'
export const EPISODE_PREMISE_PROJECTS_PATH_PREFIX = 'projects/'

export const EPISODE_PREMISE_LOG_VARIANT_SELECT = '[EpisodePremise] handleVariantSelect called:'
export const EPISODE_PREMISE_LOG_SAVE_API = '[EpisodePremise] Calling save API...'
export const EPISODE_PREMISE_LOG_RESPONSE_STATUS = '[EpisodePremise] API response status:'
export const EPISODE_PREMISE_LOG_RESPONSE_DATA = '[EpisodePremise] API response data:'
export const EPISODE_PREMISE_LOG_SAVED = '[EpisodePremise] Saved successfully, new posterUrl:'
export const EPISODE_PREMISE_LOG_SAVE_FAILED = '[EpisodePremise] Failed to save poster variant:'
export const EPISODE_PREMISE_LOG_SAVE_ERROR = '[EpisodePremise] Error saving poster variant:'
export const EPISODE_PREMISE_LOG_NO_EPISODE = '[EpisodePremise] No episodeId, skipping DB save'

export enum EpisodePremisePanelClass {
  Root = 'flex flex-1 min-h-0 overflow-hidden',
  ScrollBody = 'flex-1 min-h-0 overflow-y-auto px-5 pt-5 pb-8',
}
