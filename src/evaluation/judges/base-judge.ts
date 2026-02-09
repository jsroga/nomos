import { ScoreName } from '../engine/scores'

export interface JudgeResult {
  score: number
  reason: string
  scoreName: ScoreName
  metadata?: Record<string, unknown>
}

export abstract class BaseJudge {
  abstract name: string
  abstract scoreName: ScoreName

  abstract evaluate(input: any, output: any, expected?: any): Promise<JudgeResult>

  protected normalizeScore(score: number): number {
    return Math.max(0, Math.min(1, score))
  }
}

export interface LLMJudgeConfig {
  model?: string
  temperature?: number
}

// Placeholder: In real implementation, this would use Langfuse or Mastra to call LLM
export abstract class BaseLLMJudge extends BaseJudge {
  protected config: LLMJudgeConfig

  constructor(config: LLMJudgeConfig = {}) {
    super()
    this.config = config
  }

  // Helper to call LLM (using OpenAI directly for now as per legacy evaluators)
  protected async callLLM(prompt: string): Promise<string> {
    try {
      // Dynamic import to avoid build issues if strictly checked
      const OpenAI = (await import('openai')).default
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      })

      const response = await openai.chat.completions.create({
        model: this.config.model || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: this.config.temperature || 0,
      })

      return response.choices[0].message.content || ''
    } catch (error) {
      console.error('[BaseLLMJudge] LLM Call Failed:', error)
      throw error
    }
  }
}
