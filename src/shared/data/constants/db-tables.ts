/** Supabase / Drizzle table and column identifiers used in queries. */

export const DB_TABLE = {
  PROJECTS: 'projects',
  ASSETS: 'assets',
  BEATS: 'beats',
  CHARACTER_STATE_SNAPSHOTS: 'character_state_snapshots',
  API_KEYS: 'api_keys',
  TILES: 'tiles',
  GAME_ENTITIES: 'game_entities',
} as const

export const DB_COLUMN = {
  ID: 'id',
  PROJECT_ID: 'project_id',
  STYLE_REFERENCE_URLS: 'style_reference_urls',
  STYLE_PRESET: 'style_preset',
  GENERATION_MODE: 'generation_mode',
  CANVAS_MASTER_PROMPT: 'canvas_master_prompt',
  STYLE_ANCHOR_URL: 'style_anchor_url',
  EPISODE_ID: 'episode_id',
  BEAT_ID: 'beat_id',
  SEQUENCE: 'sequence',
  CHARACTER_ID: 'character_id',
  STRESS_LEVEL: 'stress_level',
  EMOTIONAL_STATE: 'emotional_state',
  TRANSFORMATION_PROGRESS: 'transformation_progress',
  GOALS: 'goals',
  FEARS: 'fears',
  NOTES: 'notes',
  USER_ID: 'user_id',
  CREATED_AT: 'created_at',
  LAST_USED_AT: 'last_used_at',
  REVOKED_AT: 'revoked_at',
  EXPIRES_AT: 'expires_at',
  KEY_HASH: 'key_hash',
  NAME: 'name',
  SCOPES: 'scopes',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  ENTITY_TYPE: 'entity_type',
  SOURCE_DOMAIN: 'source_domain',
  SOURCE_ENTITY_ID: 'source_entity_id',
  IMAGE_URL: 'image_url',
  USED_IN_DOMAINS: 'used_in_domains',
  UPDATED_AT: 'updated_at',
} as const

export const DB_SELECT = {
  CHARACTER_SNAPSHOT_WITH_NAME: '*, characters (id, name)',
  CHARACTER_SNAPSHOT_WITH_RELATIONS: '*, characters (id, name), beats (id, sequence, logline)',
  API_KEY_LIST: 'id, name, scopes, created_at, last_used_at, revoked_at, expires_at',
  API_KEY_CREATE: 'id, name, scopes, created_at, expires_at',
  PROJECT_STYLE_REFS:
    'style_reference_urls, style_preset, generation_mode, canvas_master_prompt, style_anchor_url',
} as const

export const DB_UPSERT = {
  TILES_PROJECT_XY: 'project_id,x,y',
  CHARACTER_SNAPSHOT_CHARACTER_BEAT: 'character_id,beat_id',
} as const
