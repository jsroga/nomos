export enum ManageToolOperation {
  Create = 'create',
  Update = 'update',
  Delete = 'delete',
  Get = 'get',
  List = 'list',
}

export const MANAGE_TOOL_OPERATION_DESC = 'The operation to perform'

export const BEAT_TOOL_ID = 'manage_beat'
export const LIST_BEATS_TOOL_ID = 'list_beats'
export const BEAT_TOOL_LIST_DESC =
  'List all beats for an episode or project. Returns beat summaries with action fields.'

export const BEAT_CREATE_EPISODE_ID_REQUIRED = 'episodeId is required for create operation'
export const BEAT_CREATE_DATA_REQUIRED = 'data is required for create operation'
export const BEAT_UPDATE_ID_REQUIRED = 'beatId is required for update operation'
export const BEAT_UPDATE_DATA_REQUIRED = 'data is required for update operation'
export const BEAT_DELETE_ID_REQUIRED = 'beatId is required for delete operation'
export const BEAT_GET_ID_REQUIRED = 'beatId is required for get operation'

export const CHARACTER_TOOL_ID = 'manage_character'
export const CHARACTER_TOOL_DESC =
  'Create, update, delete, or get a character. Create requires projectId and name. Update requires characterId.'
export const LIST_CHARACTERS_TOOL_ID = 'list_characters'
export const LIST_CHARACTERS_TOOL_DESC =
  'List all characters in a project, optionally filtered by role.'

export const CHARACTER_CREATE_PROJECT_ID_REQUIRED = 'projectId is required for create operation'
export const CHARACTER_CREATE_NAME_REQUIRED = 'data.name is required for create operation'
export const CHARACTER_UPDATE_ID_REQUIRED = 'characterId is required for update operation'
export const CHARACTER_UPDATE_DATA_REQUIRED = 'data is required for update operation'
export const CHARACTER_DELETE_ID_REQUIRED = 'characterId is required for delete operation'
export const CHARACTER_GET_ID_REQUIRED = 'characterId is required for get operation'

export const EPISODE_TOOL_ID = 'manage_episode'
export const EPISODE_TOOL_DESC =
  'Create, update, delete, or get an episode. Create requires projectId and title; pass data.premise (Ozymandias) in the same create when drafting a first episode. Update requires episodeId.'
export const LIST_EPISODES_TOOL_ID = 'list_episodes'
export const LIST_EPISODES_TOOL_DESC = 'List all episodes in a project, ordered by sequence.'

export const EPISODE_CREATE_PROJECT_ID_REQUIRED = 'projectId is required for create operation'
export const EPISODE_CREATE_TITLE_REQUIRED = 'data.title is required for create operation'
export const EPISODE_UPDATE_ID_REQUIRED = 'episodeId is required for update operation'
export const EPISODE_UPDATE_DATA_REQUIRED = 'data is required for update operation'
export const EPISODE_DELETE_ID_REQUIRED = 'episodeId is required for delete operation'
export const EPISODE_GET_ID_REQUIRED = 'episodeId is required for get operation'

export const UPDATE_WORLD_BIBLE_TOOL_ID = 'update_world_bible'
export const READ_WORLD_BIBLE_TOOL_ID = 'read_world_bible'
export const CHECK_CONTINUITY_TOOL_ID = 'check_continuity'

export const DEFAULT_CHARACTER_ROLE = 'Supporting'

export const BEAT_ACTION_FIELDS_REQUIRED =
  'REJECTED: Every beat must include actionTaken, consequence, and storyStateChange (Law of Motion). No static description beats.'
export const BEAT_ACTION_FIELDS_PARTIAL_REQUIRED =
  'REJECTED: When updating action fields, all three (actionTaken, consequence, storyStateChange) must be non-empty (Law of Motion).'
export const BEAT_LOCKED_DELETE_ERROR = 'Cannot delete a locked beat'
