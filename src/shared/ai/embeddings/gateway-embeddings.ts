import { currentGatewayContext } from '@/shared/ai/gateway/call-context'
import { embed } from '@/shared/ai/gateway'
import { LlmFeature } from '@/shared/ai/gateway/constants/llm-call'

export enum GatewayEmbedError {
  NoContext = 'Embeddings require a gateway ProjectScope on the request',
  EmptyVector = 'Embeddings returned no vector',
}

export async function embedTextsFromGatewayContext(texts: string[]): Promise<number[][]> {
  const context = currentGatewayContext()
  if (!context) {
    throw new Error(GatewayEmbedError.NoContext)
  }
  return embed({
    scope: context.scope,
    feature: LlmFeature.RagEmbedding,
    texts,
    traceId: context.traceId,
  })
}

export async function embedQueryFromGatewayContext(text: string): Promise<number[]> {
  const [vector] = await embedTextsFromGatewayContext([text])
  if (!vector) {
    throw new Error(GatewayEmbedError.EmptyVector)
  }
  return vector
}
