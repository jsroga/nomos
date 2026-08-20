import '@/shared/data/server-guard'
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import {
  CharacterMetricFieldKey,
  CharacterTextFieldKey,
  generatedCharacterFieldsFromUnknown,
} from '@/domains/storyteller/core/character-missing-fields'
import { recordFromJson } from '@/shared/data/json-guards'
import {
  PROPOSE_CHARACTER_FIELDS_TOOL_DESC,
  PROPOSE_CHARACTER_FIELDS_TOOL_ID,
} from './manage-tools-wire'

enum ProposeCharacterFieldsCopy {
  Proposed = 'Proposed fields for the unsaved character form.',
  Empty = 'No usable fields proposed.',
}

const proposedText = z.string().min(1).optional()
const proposedMetric = z.number().optional()

export const ProposeCharacterFieldsInputSchema = z.object({
  [CharacterTextFieldKey.Name]: proposedText.describe('Only when name is empty'),
  [CharacterTextFieldKey.Gender]: proposedText.describe('Only when gender is empty'),
  [CharacterTextFieldKey.Role]: proposedText.describe('Only when role is empty'),
  [CharacterTextFieldKey.Description]: proposedText.describe('Only when description is empty'),
  [CharacterTextFieldKey.Mbti]: proposedText.describe('Only when MBTI is empty'),
  [CharacterTextFieldKey.Motivation]: proposedText.describe('Only when motivation is empty'),
  [CharacterTextFieldKey.FatalFlaw]: proposedText.describe('Only when fatal flaw is empty'),
  [CharacterTextFieldKey.Secrets]: proposedText.describe('Only when secret is empty'),
  metrics: z
    .object({
      [CharacterMetricFieldKey.Valence]: proposedMetric,
      [CharacterMetricFieldKey.Arousal]: proposedMetric,
      [CharacterMetricFieldKey.PerceivedStakes]: proposedMetric,
      [CharacterMetricFieldKey.MoralAlignment]: proposedMetric,
    })
    .optional()
    .describe('Only the four dialog sliders still at defaults'),
})

export const ProposeCharacterFieldsOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  fields: z.record(z.unknown()),
})

export const proposeCharacterFieldsTool = createTool({
  id: PROPOSE_CHARACTER_FIELDS_TOOL_ID,
  description: PROPOSE_CHARACTER_FIELDS_TOOL_DESC,
  inputSchema: ProposeCharacterFieldsInputSchema,
  outputSchema: ProposeCharacterFieldsOutputSchema,
  execute: async (inputData, _context) => {
    const fields = recordFromJson(generatedCharacterFieldsFromUnknown(inputData))
    const hasFields = Object.keys(fields).length > 0
    return {
      success: hasFields,
      message: hasFields
        ? ProposeCharacterFieldsCopy.Proposed
        : ProposeCharacterFieldsCopy.Empty,
      fields,
    }
  },
})
