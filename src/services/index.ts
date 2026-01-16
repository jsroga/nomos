/**
 * Services Layer
 *
 * Shared business logic used by both REST API and MCP server.
 * Each service encapsulates domain operations and can be used independently.
 */

// Entities service - game entities across all domains
export {
  entitiesService,
  EntitiesService,
  listEntitiesSchema,
  createEntitySchema,
  updateEntitySchema,
  entityTypeSchema,
  sourceDomainSchema,
  type ListEntitiesInput,
  type CreateEntityInput,
  type UpdateEntityInput,
  type GameEntity,
  type ServiceContext as EntitiesServiceContext,
} from './entities.service'

// Storyteller service - characters, episodes, beats, chat
export {
  storytellerService,
  StorytellerService,
  listCharactersSchema,
  createCharacterSchema,
  updateCharacterSchema,
  listEpisodesSchema,
  listBeatsSchema,
  chatMessageSchema,
  type ListCharactersInput,
  type CreateCharacterInput,
  type UpdateCharacterInput,
  type ListEpisodesInput,
  type ListBeatsInput,
  type ChatMessageInput,
  type ServiceContext as StorytellerServiceContext,
  type LangSmithContext,
} from './storyteller.service'

// Tiles service - tile generation via Trigger.dev
export {
  tilesService,
  TilesService,
  threeDService,
  ThreeDService,
  portraitService,
  PortraitService,
  generateTileSchema,
  upscaleTileSchema,
  getRunStatusSchema,
  generate3DModelSchema,
  remesh3DModelSchema,
  generatePortraitSchema,
  aiProviderSchema,
  type GenerateTileInput,
  type UpscaleTileInput,
  type GetRunStatusInput,
  type Generate3DModelInput,
  type Remesh3DModelInput,
  type GeneratePortraitInput,
  type TriggerRunResult,
  type RunStatus,
  type ServiceContext as TilesServiceContext,
} from './tiles.service'

// Re-export common error types
export { ServiceError, type ServiceErrorCode } from './entities.service'

