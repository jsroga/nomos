import type { ChatCompletionContentPart } from 'openai/resources/chat/completions'
import { OpenAiChatRole } from '@/shared/data/constants/protocol'
import { TEXT_GEN_FAST_MODEL } from '@/shared/agent-kernel/models'
import {
  createVisualSubjectClient,
} from '@/domains/storyteller/services/visual-subject-llm'
import {
  PORTRAIT_VARIANT_FALLBACK,
  PortraitVariantCopy,
  PortraitVariantIndex,
  PortraitVariantLog,
  PortraitVisionPartType,
  parsePortraitVariantIndex,
} from '@/domains/storyteller/services/constants/portrait-variant'

export { parsePortraitVariantIndex, PortraitVariantIndex }

function buildVariantUserContent(
  imageUrl: string,
  subject: string,
  instruction: string,
): ChatCompletionContentPart[] {
  return [
    {
      type: PortraitVisionPartType.Text,
      text: `${instruction}\n${PortraitVariantCopy.SubjectLabel} ${subject}`,
    },
    {
      type: PortraitVisionPartType.ImageUrl,
      image_url: { url: imageUrl },
    },
  ]
}

export async function pickPortraitVariantIndex(input: {
  imageUrl: string
  subject: string
  instruction?: string
}): Promise<PortraitVariantIndex> {
  const openai = createVisualSubjectClient()
  if (!openai) return PORTRAIT_VARIANT_FALLBACK

  try {
    const response = await openai.chat.completions.create({
      model: TEXT_GEN_FAST_MODEL,
      messages: [
        {
          role: OpenAiChatRole.User,
          content: buildVariantUserContent(
            input.imageUrl,
            input.subject,
            input.instruction ?? PortraitVariantCopy.Instruction,
          ),
        },
      ],
      temperature: 0,
    })
    return parsePortraitVariantIndex(response.choices[0]?.message?.content ?? '')
  } catch (error) {
    console.warn(PortraitVariantLog.OpenAiFailed, error)
    return PORTRAIT_VARIANT_FALLBACK
  }
}
