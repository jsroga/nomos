/** Storyteller CRUD service wire values. */

import { StorytellerAnswerSeparator } from '@/domains/storyteller/core/storyteller-page-wire'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import {
  ApiErrorMessage,
  CharacterRole,
  OpenAiChatRole,
} from '@/shared/data/constants/protocol'
import {
  GenerationServiceErrorCode,
  GenerationServiceErrorName,
} from '@/shared/data/generation/constants/tiles-service'

export { CharacterRole as StorytellerCharacterRole }
export { GenerationServiceErrorCode as StorytellerCrudErrorCode }
export { GenerationServiceErrorName as StorytellerCrudErrorName }
export { OpenAiChatRole as StorytellerChatRole }
export { StorytellerAnswerSeparator as StorytellerCrudListSeparator }

export const STORYTELLER_CHARACTER_ROLE_VALUES = [
  CharacterRole.Lead,
  CharacterRole.Supporting,
  CharacterRole.Background,
] as const

export enum StorytellerCrudErrorMessage {
  CharacterNotFound = 'Character not found',
}

export enum StorytellerCrudAgentPrompt {
  RespondToUser = 'Respond to user',
}

export const STORYTELLER_CRUD_ACCESS_ERRORS = {
  project: ApiErrorMessage.PROJECT_NOT_FOUND,
  character: API_ERROR.CHARACTER_ACCESS_DENIED,
  episode: API_ERROR.EPISODE_NOT_FOUND,
  episodeAccess: ApiErrorMessage.EPISODE_NOT_FOUND,
} as const
