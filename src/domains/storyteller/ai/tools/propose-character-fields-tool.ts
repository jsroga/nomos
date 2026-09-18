import '@/shared/data/server-guard'
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import {
  CharacterMetricFieldKey,
  CharacterTextFieldKey,
  generatedCharacterFieldsFromUnknown,
} from '@/domains/storyteller/core/character-missing-fields'
import { clampedCharacterMetricSchema } from '@/domains/storyteller/core/character-metric-schema'
import { recordFromJson } from '@/shared/data/json-guards'
import {
  PROPOSE_CHARACTER_FIELDS_TOOL_DESC,
  PROPOSE_CHARACTER_FIELDS_TOOL_ID,
} from './manage-tools-wire'

export enum ProposeCharacterFieldsCopy {
  Proposed =
    'Proposed fields for the unsaved character form.\n\nApply in the dialog to keep them. Nothing is saved to the world yet.',
  Empty =
    'No usable fields proposed.\n\nThe form is unchanged. Fill a field or ask again with more detail.',
}

const proposedText = z.string().min(1).optional()
const proposedMetric = (key: CharacterMetricFieldKey) =>
  clampedCharacterMetricSchema(key).optional()

export const ProposeCharacterFieldsInputSchema = z.object({
  [CharacterTextFieldKey.Name]: proposedText.describe('Only when name is empty'),
  [CharacterTextFieldKey.Gender]: proposedText.describe('Only when gender is empty'),
  [CharacterTextFieldKey.Role]: proposedText.describe('Only when role is empty'),
  [CharacterTextFieldKey.Description]: proposedText.describe('Only when description is empty'),
  [CharacterTextFieldKey.Mbti]: proposedText.describe(
    'Highly recommended. Always fill when MBTI is empty.',
  ),
  [CharacterTextFieldKey.Motivation]: proposedText.describe('Only when motivation is empty'),
  [CharacterTextFieldKey.FatalFlaw]: proposedText.describe('Only when fatal flaw is empty'),
  [CharacterTextFieldKey.Secrets]: proposedText.describe('Only when secret is empty'),
  metrics: z
    .object({
      [CharacterMetricFieldKey.Valence]: proposedMetric(CharacterMetricFieldKey.Valence),
      [CharacterMetricFieldKey.Arousal]: proposedMetric(CharacterMetricFieldKey.Arousal),
      [CharacterMetricFieldKey.PerceivedStakes]: proposedMetric(
        CharacterMetricFieldKey.PerceivedStakes,
      ),
      [CharacterMetricFieldKey.MoralAlignment]: proposedMetric(
        CharacterMetricFieldKey.MoralAlignment,
      ),
    })
    .optional()
    .describe('Only the four dialog sliders still at defaults'),
})

export const ProposeCharacterFieldsOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
})

export function buildProposeCharacterFieldsOutput(inputData: unknown): {
  success: boolean
  message: string
} {
  const fields = recordFromJson(generatedCharacterFieldsFromUnknown(inputData))
  const hasFields = Object.keys(fields).length > 0
  return {
    success: hasFields,
    message: hasFields
      ? ProposeCharacterFieldsCopy.Proposed
      : ProposeCharacterFieldsCopy.Empty,
  }
}

export const proposeCharacterFieldsTool = createTool({
  id: PROPOSE_CHARACTER_FIELDS_TOOL_ID,
  description: PROPOSE_CHARACTER_FIELDS_TOOL_DESC,
  inputSchema: ProposeCharacterFieldsInputSchema,
  outputSchema: ProposeCharacterFieldsOutputSchema,
  execute: async (inputData, _context) => buildProposeCharacterFieldsOutput(inputData),
})
