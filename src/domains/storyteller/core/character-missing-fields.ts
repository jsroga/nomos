import { readNumber, readString, recordFromJson } from '@/shared/data/json-guards'

export const DEFAULT_CHARACTER_METRICS = {
  valence: 0,
  arousal: 50,
  autonomy: 60,
  competence: 60,
  relatedness: 50,
  cognitiveClarity: 70,
  perceivedStakes: 40,
  socialSafety: 60,
  moralAlignment: 70,
}

export type CharacterMetricDefaults = typeof DEFAULT_CHARACTER_METRICS

export enum CharacterTextFieldKey {
  Name = 'name',
  Gender = 'gender',
  Role = 'role',
  Description = 'description',
  Mbti = 'mbti',
  Motivation = 'motivation',
  FatalFlaw = 'fatalFlaw',
  Secrets = 'secrets',
}

export enum CharacterMetricFieldKey {
  Valence = 'valence',
  Arousal = 'arousal',
  Autonomy = 'autonomy',
  Competence = 'competence',
  Relatedness = 'relatedness',
  CognitiveClarity = 'cognitiveClarity',
  PerceivedStakes = 'perceivedStakes',
  SocialSafety = 'socialSafety',
  MoralAlignment = 'moralAlignment',
}

export const CHARACTER_TEXT_FIELD_KEYS: readonly CharacterTextFieldKey[] = [
  CharacterTextFieldKey.Name,
  CharacterTextFieldKey.Gender,
  CharacterTextFieldKey.Role,
  CharacterTextFieldKey.Description,
  CharacterTextFieldKey.Mbti,
  CharacterTextFieldKey.Motivation,
  CharacterTextFieldKey.FatalFlaw,
  CharacterTextFieldKey.Secrets,
]

export const CHARACTER_METRIC_FIELD_KEYS: readonly CharacterMetricFieldKey[] = [
  CharacterMetricFieldKey.Valence,
  CharacterMetricFieldKey.Arousal,
  CharacterMetricFieldKey.Autonomy,
  CharacterMetricFieldKey.Competence,
  CharacterMetricFieldKey.Relatedness,
  CharacterMetricFieldKey.CognitiveClarity,
  CharacterMetricFieldKey.PerceivedStakes,
  CharacterMetricFieldKey.SocialSafety,
  CharacterMetricFieldKey.MoralAlignment,
]

export const CHARACTER_DIALOG_METRIC_KEYS: readonly CharacterMetricFieldKey[] = [
  CharacterMetricFieldKey.Valence,
  CharacterMetricFieldKey.Arousal,
  CharacterMetricFieldKey.PerceivedStakes,
  CharacterMetricFieldKey.MoralAlignment,
]

export const CHARACTER_MISSING_METRICS_MAX = CHARACTER_DIALOG_METRIC_KEYS.length

export interface CharacterFilledDraft {
  name: string
  gender: string
  role: string
  description: string
  mbti: string
  motivation: string
  fatalFlaw: string
  secrets: string
  metrics: CharacterMetricDefaults
}

export interface GeneratedCharacterFields {
  name?: string
  gender?: string
  role?: string
  description?: string
  mbti?: string
  motivation?: string
  fatalFlaw?: string
  secrets?: string
  metrics?: Partial<CharacterMetricDefaults>
}

function isBlank(value: string): boolean {
  return value.trim().length === 0
}

export function listMissingCharacterTextFields(
  filled: CharacterFilledDraft
): CharacterTextFieldKey[] {
  return CHARACTER_TEXT_FIELD_KEYS.filter(key => isBlank(filled[key]))
}

export function listMissingCharacterMetricKeys(
  metrics: CharacterMetricDefaults,
  defaults: CharacterMetricDefaults = DEFAULT_CHARACTER_METRICS
): CharacterMetricFieldKey[] {
  return CHARACTER_DIALOG_METRIC_KEYS.filter(key => metrics[key] === defaults[key])
}

export function hasMissingCharacterFields(
  filled: CharacterFilledDraft,
  defaults: CharacterMetricDefaults = DEFAULT_CHARACTER_METRICS
): boolean {
  return (
    listMissingCharacterTextFields(filled).length > 0 ||
    listMissingCharacterMetricKeys(filled.metrics, defaults).length > 0
  )
}

export function hasUsableCharacterDraft(filled: CharacterFilledDraft): boolean {
  return !isBlank(filled.name) || !isBlank(filled.description)
}

function takeGeneratedText(current: string, generated: string | undefined): string {
  if (!isBlank(current)) return current
  const next = generated?.trim()
  return next && next.length > 0 ? next : current
}

function takeNonBlankText(snapshot: string, live: string): string {
  return isBlank(live) ? snapshot : live
}

export function mergeNonBlankCharacterDraft(
  snapshot: CharacterFilledDraft,
  live: CharacterFilledDraft,
  defaults: CharacterMetricDefaults = DEFAULT_CHARACTER_METRICS,
): CharacterFilledDraft {
  const metrics = { ...snapshot.metrics }
  for (const key of CHARACTER_METRIC_FIELD_KEYS) {
    if (live.metrics[key] !== defaults[key]) metrics[key] = live.metrics[key]
  }
  return {
    name: takeNonBlankText(snapshot.name, live.name),
    gender: takeNonBlankText(snapshot.gender, live.gender),
    role: takeNonBlankText(snapshot.role, live.role),
    description: takeNonBlankText(snapshot.description, live.description),
    mbti: takeNonBlankText(snapshot.mbti, live.mbti),
    motivation: takeNonBlankText(snapshot.motivation, live.motivation),
    fatalFlaw: takeNonBlankText(snapshot.fatalFlaw, live.fatalFlaw),
    secrets: takeNonBlankText(snapshot.secrets, live.secrets),
    metrics,
  }
}

export function capGeneratedMetrics(
  generated: Partial<CharacterMetricDefaults> | undefined,
  current: CharacterMetricDefaults,
  defaults: CharacterMetricDefaults = DEFAULT_CHARACTER_METRICS,
  max = CHARACTER_MISSING_METRICS_MAX
): Partial<CharacterMetricDefaults> {
  if (!generated) return {}
  const result: Partial<CharacterMetricDefaults> = {}
  const allowed = new Set(listMissingCharacterMetricKeys(current, defaults))
  for (const key of Object.keys(generated)) {
    if (Object.keys(result).length >= max) break
    const metricKey = CHARACTER_DIALOG_METRIC_KEYS.find(candidate => candidate === key)
    if (!metricKey || !allowed.has(metricKey)) continue
    const value = generated[metricKey]
    if (typeof value !== 'number' || Number.isNaN(value)) continue
    result[metricKey] = value
  }
  return result
}

export function stripFilledGeneratedFields(
  filled: CharacterFilledDraft,
  generated: GeneratedCharacterFields,
  defaults: CharacterMetricDefaults = DEFAULT_CHARACTER_METRICS
): GeneratedCharacterFields {
  const missingText = new Set(listMissingCharacterTextFields(filled))
  const stripped: GeneratedCharacterFields = {}

  for (const key of CHARACTER_TEXT_FIELD_KEYS) {
    if (!missingText.has(key)) continue
    const value = generated[key]
    if (typeof value !== 'string' || isBlank(value)) continue
    stripped[key] = value.trim()
  }

  const metrics = capGeneratedMetrics(generated.metrics, filled.metrics, defaults)
  if (Object.keys(metrics).length > 0) stripped.metrics = metrics
  return stripped
}

export function applyGeneratedCharacterFields<T extends CharacterFilledDraft>(
  current: T,
  generated: GeneratedCharacterFields,
  defaults: CharacterMetricDefaults = DEFAULT_CHARACTER_METRICS
): T {
  const safe = stripFilledGeneratedFields(current, generated, defaults)
  return {
    ...current,
    name: takeGeneratedText(current.name, safe.name),
    gender: takeGeneratedText(current.gender, safe.gender),
    role: takeGeneratedText(current.role, safe.role),
    description: takeGeneratedText(current.description, safe.description),
    mbti: takeGeneratedText(current.mbti, safe.mbti),
    motivation: takeGeneratedText(current.motivation, safe.motivation),
    fatalFlaw: takeGeneratedText(current.fatalFlaw, safe.fatalFlaw),
    secrets: takeGeneratedText(current.secrets, safe.secrets),
    metrics: { ...current.metrics, ...safe.metrics },
  }
}

export function generatedCharacterFieldsFromUnknown(value: unknown): GeneratedCharacterFields {
  const record = recordFromJson(value)
  const result: GeneratedCharacterFields = {}
  for (const key of CHARACTER_TEXT_FIELD_KEYS) {
    const raw = readString(record[key])
    if (!raw || isBlank(raw)) continue
    result[key] = raw.trim()
  }
  const metricsRaw = recordFromJson(record.metrics)
  const metrics: Partial<CharacterMetricDefaults> = {}
  for (const key of CHARACTER_METRIC_FIELD_KEYS) {
    const raw = readNumber(metricsRaw[key])
    if (raw === undefined) continue
    metrics[key] = raw
  }
  if (Object.keys(metrics).length > 0) result.metrics = metrics
  return result
}
