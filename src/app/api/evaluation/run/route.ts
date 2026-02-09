import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import * as path from 'path'
import * as fs from 'fs'
import { withAuth, type AuthenticatedRequest } from '@/lib/api-utils'
import { getErrorMessage } from '@/lib/error-utils'

/**
 * Evaluation Runner API
 *
 * Supports multiple evaluation methodologies:
 * - storyteller: Standard storyteller evaluation
 * - personas: Persona fidelity evaluation
 * - eq-bench: EQ-Bench methodology (arxiv.org/html/2312.06281v2)
 * - pro: Professional evaluation suite
 */
export const POST = withAuth(async (request: NextRequest, _auth: AuthenticatedRequest) => {
  try {
    const body = await request.json()
    const { projectId, experiment = 'storyteller', content, options = {} } = body

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Handle inline EQ-Bench evaluation (no spawn, immediate result)
    if (experiment === 'eq-bench-inline' && content) {
      const { quickEQBenchEval } = await import('@/evaluation/langfuse/eq-bench-evaluator')
      const result = await quickEQBenchEval(content, {
        context: options.context,
        canon: options.canon,
      })
      return NextResponse.json({
        success: true,
        experiment: 'eq-bench',
        methodology: 'arxiv.org/html/2312.06281v2 (Paillat et al., 2023)',
        scores: result,
        note: 'Results recorded to Langfuse traces',
      })
    }

    // Determine which script to run
    let scriptPath = ''
    let scriptArgs: string[] = []

    switch (experiment) {
      case 'personas':
        scriptPath = 'src/evaluation/experiments/eval-personas.ts'
        break
      case 'storyteller':
        scriptPath = 'src/evaluation/experiments/storyteller-experiments.ts'
        break
      case 'eq-bench':
        // EQ-Bench evaluation based on arxiv.org/html/2312.06281v2
        scriptPath = 'scripts/run-eq-bench-eval.ts'
        if (options.quick) scriptArgs.push('--quick')
        if (options.model) scriptArgs.push('--model', options.model)
        if (options.sample) scriptArgs.push('--sample', String(options.sample))
        break
      default:
        scriptPath = 'src/evaluation/experiments/eval-pro.ts'
    }

    const fullScriptPath = path.resolve(process.cwd(), scriptPath)
    if (!fs.existsSync(fullScriptPath)) {
      return NextResponse.json({ error: `Script not found: ${scriptPath}` }, { status: 404 })
    }

    // Run the evaluation in the background
    const child = spawn('npx', ['tsx', scriptPath, ...scriptArgs], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        TEST_PROJECT_ID: projectId,
      },
      detached: true,
      stdio: 'ignore',
    })

    child.unref()

    // Return methodology info for EQ-Bench
    const methodologyInfo =
      experiment === 'eq-bench'
        ? {
            methodology: 'EQ-Bench (arxiv.org/html/2312.06281v2)',
            paper:
              'EQ-Bench: A Benchmark for Emotional Intelligence in Large Language Models (Paillat et al., 2023)',
            evaluators: ['Emotion Judge', 'Magic Judge', 'Consistency Judge'],
          }
        : undefined

    return NextResponse.json({
      message: 'Evaluation started in background',
      experiment,
      pid: child.pid,
      ...methodologyInfo,
    })
  } catch (error: unknown) {
    console.error('Error starting evaluation:', error)
    return NextResponse.json(
      { error: getErrorMessage(error) || 'Failed to start evaluation' },
      { status: 500 }
    )
  }
})
