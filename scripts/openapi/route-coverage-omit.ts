/** Prefixes for workspace-only / SSE / admin routes that stay out of public OpenAPI. */

export const OPENAPI_COVERAGE_OMIT_PREFIXES: readonly string[] = [
  '/admin',
  '/ai',
  '/assets',
  '/assistant',
  '/auth',
  '/complete-token',
  '/debug',
  '/delete-image',
  '/entities/mark-referenced',
  '/entities/resolve',
  '/generate-3d',
  '/library',
  '/llm-judge',
  '/loop-creator',
  '/projects',
  '/proxy-model',
  '/repaint',
  '/segment',
  '/save-image',
  '/save-model',
  '/settings',
  '/storyteller/autonomous',
  '/storyteller/beats/generate-prompt',
  '/storyteller/chat',
  '/storyteller/consistency/fix-run',
  '/storyteller/episodes/{episodeId}/generate-combined',
  '/storyteller/generate-metrics',
  '/storyteller/save-',
  '/storyteller/script',
  '/storyteller/script/complete',
  '/storyteller/script/generate-section',
  '/storyteller/script/compile',
  '/storyteller/artifact-draft',
  '/storyteller/script-review',
  '/storyteller/workflow',
  '/style-refs',
  '/tiles',
  '/trigger',
  '/trigger-',
  '/upload-tile',
  '/upscale',
  '/users',
  '/waitlist',
  '/workflows',
  '/world/assets',
  '/world/projects',
  '/3d-canvas/designs',
  '/3d-canvas/material',
  '/3d-canvas/retexture',
  '/3d-canvas/texture',
  '/3d-canvas/textures',
]

export function isOmittedOpenApiPath(apiPath: string): boolean {
  return OPENAPI_COVERAGE_OMIT_PREFIXES.some(prefix => matchesOmitPrefix(apiPath, prefix))
}

function matchesOmitPrefix(apiPath: string, prefix: string): boolean {
  if (apiPath === prefix) return true
  if (apiPath.startsWith(`${prefix}/`)) return true
  if (prefix.endsWith('-') && apiPath.startsWith(prefix)) return true
  return false
}
