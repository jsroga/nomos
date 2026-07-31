/** Wire values for the admin "test this model" probe (roadmap A1). */

export const MODEL_PROBE_PATH = '/chat/completions'
export const MODEL_PROBE_PROMPT = 'Reply with the single word: ok'
export const MODEL_PROBE_AUTH_HEADER = 'Authorization'
export const MODEL_PROBE_CONTENT_TYPE_HEADER = 'Content-Type'
export const MODEL_PROBE_MAX_TOKENS = 8
export const MODEL_PROBE_TIMEOUT_MS = 20_000
export const MODEL_PROBE_SAMPLE_MAX_CHARS = 120

export enum ModelProbeError {
  MissingKey = 'OPENROUTER_API_KEY is not set — cannot reach OpenRouter.',
  InvalidId = 'Not a valid OpenRouter model id (expected provider/model).',
  Timeout = 'Timed out waiting for OpenRouter.',
  NoContent = 'OpenRouter accepted the request but returned no content.',
  Unreachable = 'Could not reach OpenRouter.',
}
