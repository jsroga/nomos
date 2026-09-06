/**
 * Columns a PATCH caller may write on a storyteller project.
 *
 * `id` and `userId` are deliberately absent.
 */
import { z } from 'zod'

export enum ProjectPatchField {
  Name = 'name',
  Description = 'description',
  SeriesBible = 'seriesBible',
  SeriesBibleSnake = 'series_bible',
  StoryPlan = 'storyPlan',
  StoryPlanSnake = 'story_plan',
  MasterPrompt = 'masterPrompt',
  MasterPromptSnake = 'master_prompt',
  StylePreset = 'stylePreset',
  StylePresetSnake = 'style_preset',
  GenerationMode = 'generationMode',
  GenerationModeSnake = 'generation_mode',
  StyleAnchorUrl = 'styleAnchorUrl',
  StyleAnchorUrlSnake = 'style_anchor_url',
  CanvasMasterPrompt = 'canvasMasterPrompt',
  CanvasMasterPromptSnake = 'canvas_master_prompt',
  StyleReferenceUrls = 'styleReferenceUrls',
  StyleReferenceUrlsSnake = 'style_reference_urls',
}

const optionalText = z.string().nullable().optional()

export const projectPatchRequestSchema = z.object({
  [ProjectPatchField.Name]: optionalText,
  [ProjectPatchField.Description]: optionalText,
  [ProjectPatchField.SeriesBible]: z.unknown().optional(),
  [ProjectPatchField.SeriesBibleSnake]: z.unknown().optional(),
  [ProjectPatchField.StoryPlan]: z.unknown().optional(),
  [ProjectPatchField.StoryPlanSnake]: z.unknown().optional(),
  [ProjectPatchField.MasterPrompt]: optionalText,
  [ProjectPatchField.MasterPromptSnake]: optionalText,
  [ProjectPatchField.StylePreset]: optionalText,
  [ProjectPatchField.StylePresetSnake]: optionalText,
  [ProjectPatchField.GenerationMode]: optionalText,
  [ProjectPatchField.GenerationModeSnake]: optionalText,
  [ProjectPatchField.StyleAnchorUrl]: optionalText,
  [ProjectPatchField.StyleAnchorUrlSnake]: optionalText,
  [ProjectPatchField.CanvasMasterPrompt]: optionalText,
  [ProjectPatchField.CanvasMasterPromptSnake]: optionalText,
  [ProjectPatchField.StyleReferenceUrls]: z.unknown().optional(),
  [ProjectPatchField.StyleReferenceUrlsSnake]: z.unknown().optional(),
})

export type ProjectPatchRequest = z.infer<typeof projectPatchRequestSchema>

export function projectPatchRequestRecord(body: ProjectPatchRequest): Record<string, unknown> {
  const record: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(body)) {
    if (value !== undefined) record[key] = value
  }
  return record
}
