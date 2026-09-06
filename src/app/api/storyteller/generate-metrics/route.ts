import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { completeStructured } from '@/shared/ai/gateway'
import { LlmFeature } from '@/shared/ai/gateway/constants/llm-call'
import { requireAuth } from '@/shared/auth/auth'
import { tryProjectScope } from '@/shared/auth/project-scope'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { HttpStatus } from '@/shared/data/constants/protocol'
import { generateMetricsRequestSchema } from '@/domains/storyteller/core/io/openapi-schemas'
import { recordFromJson } from '@/shared/data/json-guards'
import { resolveUserPickerOpenRouterModelId } from '@/domains/storyteller/core/io/resolve-user-picker-model'

const CharacterMetricsSchema = z.object({
  valence: z.number(),
  arousal: z.number(),
  autonomy: z.number(),
  competence: z.number(),
  relatedness: z.number(),
  cognitiveClarity: z.number(),
  perceivedStakes: z.number(),
  socialSafety: z.number(),
  moralAlignment: z.number(),
})

const METRICS_SYSTEM = `You are an expert character psychologist. Analyze the character description and generate baseline psychological metrics (based on Affective Circumplex Model + Self-Determination Theory).

Return ONLY JSON with keys: valence, arousal, autonomy, competence, relatedness, cognitiveClarity, perceivedStakes, socialSafety, moralAlignment.

## Metrics Guide:

### Core Affective State (Emotional Circumplex)
- valence (-100 to +100): Emotional tone from very negative to very positive
- arousal (0-100): Energy/activation level

### Psychological Needs (Self-Determination Theory)
- autonomy (0-100): Perceived freedom and self-direction
- competence (0-100): Belief in capability to handle challenges
- relatedness (0-100): Sense of connection to others

### Cognitive & Threat Assessment
- cognitiveClarity (0-100): Mental sharpness and decision-making capacity
- perceivedStakes (0-100): How much they believe is on the line

### Social & Moral Mechanisms
- socialSafety (0-100): Perceived safety in current social context
- moralAlignment (0-100): Alignment between actions and values`

export async function POST(req: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) {
      return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: HttpStatus.UNAUTHORIZED })
    }

    const parsed = generateMetricsRequestSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: API_ERROR.INVALID_PAYLOAD }, { status: HttpStatus.BAD_REQUEST })
    }
    const projectId = parsed.data.projectId
    const description = parsed.data.description
    const modelName = parsed.data.modelName

    const scope = await tryProjectScope(projectId, session.user.id)
    if (!scope) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: HttpStatus.NOT_FOUND })
    }

    const metrics = await completeStructured({
      scope,
      feature: LlmFeature.StorytellerCharacterFields,
      model: resolveUserPickerOpenRouterModelId(modelName),
      system: METRICS_SYSTEM,
      prompt: description,
      schema: CharacterMetricsSchema,
    })

    return NextResponse.json({ metrics: recordFromJson(metrics) })
  } catch (error) {
    console.error(API_LOG_PREFIX.METRICS_GENERATION_ERROR, error)
    return NextResponse.json({ error: API_ERROR.FAILED_GENERATE_METRICS }, { status: HttpStatus.INTERNAL })
  }
}
