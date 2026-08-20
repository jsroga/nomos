import { generateObject } from 'ai'
import { createPureModel, openRouterClientConfig } from '@/shared/agent-kernel/models'
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
  GENERATE_CHARACTER_FIELDS_MAX_RETRIES,
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
  projectId: string
  filled: CharacterFilledDraft
}

export interface GenerateCharacterFieldsDeps {
  loadCanonPack?: (projectId: string) => Promise<StoryCanonPack | null>
  generate?: (input: {
    system: string
    prompt: string
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
}): Promise<GeneratedCharacterFields> {
  const { apiKey } = openRouterClientConfig()
  if (!apiKey) {
    throw new GenerateCharacterFieldsError(
      GenerateCharacterFieldsErrorCode.OpenRouterNotConfigured,
      GenerateCharacterFieldsErrorCode.OpenRouterNotConfigured
    )
  }

  const { object } = await generateObject({
    model: createPureModel(GENERATE_CHARACTER_FIELDS_MODEL),
    schema: generatedCharacterFieldsLlmSchema,
    system: input.system,
    prompt: input.prompt,
    maxRetries: GENERATE_CHARACTER_FIELDS_MAX_RETRIES,
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
  const pack = await loadCanonPack(input.projectId)
  const usablePack = pack !== null && hasUsableCanonPack(pack)

  if (!hasUsableCharacterDraft(filled) && !usablePack) {
    throw new GenerateCharacterFieldsError(
      GenerateCharacterFieldsErrorCode.InsufficientContext,
      GenerateCharacterFieldsErrorCode.InsufficientContext
    )
  }

  try {
    const generated = await generate({
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

