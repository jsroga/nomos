import { recordArrayFromJson, recordFromJson } from '@/shared/data/json-guards'

export function findGeminiInlineImageData(
  parts: unknown,
): Record<string, unknown> | undefined {
  for (const part of recordArrayFromJson(parts)) {
    const inlineData = part.inline_data ?? part.inlineData
    if (inlineData !== undefined) {
      return recordFromJson(inlineData)
    }
  }
  return undefined
}
