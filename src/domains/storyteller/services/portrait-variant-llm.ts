import { complete } from '@/shared/ai/gateway'
import { LlmFeature } from '@/shared/ai/gateway/constants/llm-call'
import { jobContextScope } from '@/shared/auth/project-scope'
import { TEXT_GEN_FAST_MODEL } from '@/shared/agent-kernel/models'
import {
  PORTRAIT_VARIANT_FALLBACK,
  PortraitVariantCopy,
  PortraitVariantIndex,
  PortraitVariantLog,
  parsePortraitVariantIndex,
} from '@/domains/storyteller/services/constants/portrait-variant'

export { parsePortraitVariantIndex, PortraitVariantIndex }

function variantPrompt(imageUrl: string, subject: string, instruction: string): string {
  return `${instruction}\n${PortraitVariantCopy.SubjectLabel} ${subject}\nImage: ${imageUrl}`
}

export async function pickPortraitVariantIndex(input: {
  imageUrl: string
  subject: string
  instruction?: string
  projectId: string
}): Promise<PortraitVariantIndex> {
  try {
    const { text } = await complete({
      scope: jobContextScope(input.projectId),
      feature: LlmFeature.StorytellerVisualSubject,
      model: TEXT_GEN_FAST_MODEL,
      prompt: variantPrompt(
        input.imageUrl,
        input.subject,
        input.instruction ?? PortraitVariantCopy.Instruction,
      ),
      temperature: 0,
    })
    return parsePortraitVariantIndex(text)
  } catch (error) {
    console.warn(PortraitVariantLog.OpenAiFailed, error)
    return PORTRAIT_VARIANT_FALLBACK
  }
}
