import type { ProjectScope } from '@/shared/auth/project-scope'
import { env } from '@/shared/config/env'
import { completeStructured } from '@/shared/ai/gateway'
import { LlmFeature } from '@/shared/ai/gateway/constants/llm-call'
import {
  CharacterTextFieldKey,
  DEFAULT_CHARACTER_METRICS,
  generatedCharacterFieldsFromUnknown,
  hasMissingCharacterFields,
  hasUsableCharacterDraft,
  listMissingCharacterMetricKeys,
  listMissingCharacterTextFields,
  stripFilledGeneratedFields,
  type CharacterFilledDraft,
  type GeneratedCharacterFields,
} from '@/domains/storyteller/core/character-missing-fields'
import {
  characterFieldsUserPrompt,
  GENERATE_CHARACTER_FIELDS_MODEL,
  GENERATE_CHARACTER_FIELDS_TEMPERATURE,
  GenerateCharacterFieldsCopy,
  GenerateCharacterFieldsErrorCode,
  GenerateCharacterFieldsErrorName,
  generatedCharacterFieldsLlmSchema,
} from '@/domains/storyteller/services/constants/generate-character-fields'
import {
  formatCanonForTextFill,
  hasUsableCanonPack,
} from '@/domains/storyteller/services/story-canon-pack-format'
import {
  loadStoryCanonPack,
  type StoryCanonPack,
} from '@/domains/storyteller/services/story-canon-pack'

export class GenerateCharacterFieldsError extends Error {
  constructor(
    readonly code: GenerateCharacterFieldsErrorCode,
    message: string
  ) {
    super(message)
    this.name = GenerateCharacterFieldsErrorName.GenerateCharacterFieldsError
  }
}

export interface GenerateCharacterMissingFieldsInput {
  scope: ProjectScope
  filled: CharacterFilledDraft
}

export interface GenerateCharacterFieldsDeps {
  loadCanonPack?: (scope: ProjectScope) => Promise<StoryCanonPack | null>
  generate?: (input: {
    system: string
    prompt: string
    scope: ProjectScope
  }) => Promise<GeneratedCharacterFields>
}

function filledLine(key: CharacterTextFieldKey, value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed.length > 0 ? `${key}: ${trimmed}` : undefined
}

function filledSummary(filled: CharacterFilledDraft): string {
  return [
    filledLine(CharacterTextFieldKey.Name, filled.name),
    filledLine(CharacterTextFieldKey.Gender, filled.gender),
    filledLine(CharacterTextFieldKey.Role, filled.role),
    filledLine(CharacterTextFieldKey.Description, filled.description),
    filledLine(CharacterTextFieldKey.Mbti, filled.mbti),
    filledLine(CharacterTextFieldKey.Motivation, filled.motivation),
    filledLine(CharacterTextFieldKey.FatalFlaw, filled.fatalFlaw),
    filledLine(CharacterTextFieldKey.Secrets, filled.secrets),
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n')
}

async function defaultGenerate(input: {
  system: string
  prompt: string
  scope: ProjectScope
}): Promise<GeneratedCharacterFields> {
  if (!env.OPENROUTER_API_KEY) {
    throw new GenerateCharacterFieldsError(
      GenerateCharacterFieldsErrorCode.OpenRouterNotConfigured,
      GenerateCharacterFieldsErrorCode.OpenRouterNotConfigured
    )
  }

  const object = await completeStructured({
    scope: input.scope,
    feature: LlmFeature.StorytellerCharacterFields,
    model: GENERATE_CHARACTER_FIELDS_MODEL,
    schema: generatedCharacterFieldsLlmSchema,
    system: input.system,
    prompt: input.prompt,
    temperature: GENERATE_CHARACTER_FIELDS_TEMPERATURE,
  })
  return generatedCharacterFieldsFromUnknown(object)
}

export async function generateCharacterMissingFields(
  input: GenerateCharacterMissingFieldsInput,
  deps: GenerateCharacterFieldsDeps = {}
): Promise<GeneratedCharacterFields> {
  const filled: CharacterFilledDraft = {
    ...input.filled,
    metrics: { ...DEFAULT_CHARACTER_METRICS, ...input.filled.metrics },
  }

  if (!hasMissingCharacterFields(filled)) return {}

  const loadCanonPack = deps.loadCanonPack ?? loadStoryCanonPack
  const generate = deps.generate ?? defaultGenerate
  const pack = await loadCanonPack(input.scope)
  const usablePack = pack !== null && hasUsableCanonPack(pack)

  if (!hasUsableCharacterDraft(filled) && !usablePack) {
    throw new GenerateCharacterFieldsError(
      GenerateCharacterFieldsErrorCode.InsufficientContext,
      GenerateCharacterFieldsErrorCode.InsufficientContext
    )
  }

  try {
    const generated = await generate({
      scope: input.scope,
      system: GenerateCharacterFieldsCopy.System,
      prompt: characterFieldsUserPrompt({
        missingText: listMissingCharacterTextFields(filled),
        missingMetrics: listMissingCharacterMetricKeys(filled.metrics),
        filledSummary: filledSummary(filled),
        storyContext: pack ? formatCanonForTextFill(pack) : '',
      }),
    })
    return stripFilledGeneratedFields(filled, generated)
  } catch (error) {
    if (error instanceof GenerateCharacterFieldsError) throw error
    console.error(GenerateCharacterFieldsCopy.FailedLog, error)
    throw new GenerateCharacterFieldsError(
      GenerateCharacterFieldsErrorCode.GenerationFailed,
      error instanceof Error && error.message.trim().length > 0
        ? error.message
        : GenerateCharacterFieldsErrorCode.GenerationFailed
    )
  }
}

