/** Mastra instance bootstrap filesystem and serialization wire values. */

export const MASTRA_DIR_NAME = '.mastra'
export const PACKAGE_JSON_FILENAME = 'package.json'
export const NEXT_CONFIG_FILENAME = 'next.config.js'
export const MASTRA_NESTED_SERVER_PACKAGE = 'server'
export const PACKAGE_JSON_NAME_FIELD = 'name'

export const MASTRA_SERIALIZATION_MAX_ATTR_CHARS = '100000'
export const MASTRA_SERIALIZATION_MAX_DEPTH = '20'
export const MASTRA_SERIALIZATION_MAX_KEYS = '500'
export const MASTRA_SERIALIZATION_MAX_ARRAY_ITEMS = '500'
export const MASTRA_SERIALIZATION_MAX_TOTAL_CHARS = '1000000'

export const MASTRA_DATABASE_URL_WARNING =
  '⚠️ [Mastra] DATABASE_URL is not set. Memory persistence might fail if storage is required.'

export const MASTRA_STORAGE_ID = 'storyteller-storage'
export const MASTRA_LOGGER_NAME = 'Mastra'
export const MASTRA_LOGGER_LEVEL = 'info'
export const MASTRA_OBSERVABILITY_SERVICE = 'storyteller'

export const MASTRA_FALLBACK_DATABASE_URL =
  'postgresql://postgres:postgres@localhost:5432/postgres'
