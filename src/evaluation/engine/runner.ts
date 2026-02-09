import { langfuse } from '../../agent-core/observability'
import { ScoreName } from './scores'
import { getErrorMessage } from '@/lib/error-utils'

export interface EvaluationItem {
  id: string
  input: any
  expectedOutput?: any
  metadata?: Record<string, any>
}

export interface EvaluationResult {
  itemId: string
  output: any
  scores: Record<string, number>
  passed: boolean
  error?: string
}

export interface Judge {
  name: string
  evaluate(
    input: any,
    output: any,
    expected?: any
  ): Promise<{ score: number; reason: string; scoreName: ScoreName }>
}

export class EvaluationRunner {
  private judges: Judge[]

  constructor(judges: Judge[]) {
    this.judges = judges
  }

  async run(
    datasetName: string,
    items: EvaluationItem[],
    subject: (input: any) => Promise<any>
  ): Promise<EvaluationResult[]> {
    console.log(`Starting evaluation on dataset: ${datasetName} (${items.length} items)`)
    const results: EvaluationResult[] = []

    for (const item of items) {
      const traceId = `eval-${datasetName}-${item.id}-${Date.now()}`
      const trace = langfuse.trace({
        id: traceId,
        name: `Eval: ${datasetName} - ${item.id}`,
        metadata: { ...item.metadata, dataset: datasetName },
        input: item.input,
      })

      try {
        // Execute Subject
        const start = Date.now()
        const output = await subject(item.input)
        const duration = Date.now() - start

        trace.update({ output })

        // Run Judges
        const scores: Record<string, number> = {}
        let allPassed = true

        for (const judge of this.judges) {
          const evalResult = await judge.evaluate(item.input, output, item.expectedOutput)

          trace.score({
            name: evalResult.scoreName,
            value: evalResult.score,
            comment: evalResult.reason,
          })

          scores[evalResult.scoreName] = evalResult.score
          // Simple pass/fail logic: strictly 1 for binary, > 0.7 for continuous
          if (evalResult.score < 0.7) allPassed = false
        }

        results.push({
          itemId: item.id,
          output,
          scores,
          passed: allPassed,
        })
      } catch (error: unknown) {
        console.error(`Error processing item ${item.id}:`, error)
        trace.update({ metadata: { error: getErrorMessage(error), ...item.metadata } })
        results.push({
          itemId: item.id,
          output: null,
          scores: {},
          passed: false,
          error: getErrorMessage(error),
        })
      } finally {
        // We don't await flush here to keep speed, but we should flush at end
      }
    }

    await langfuse.flush()
    return results
  }
}
