/**
 * SELF-IMPROVEMENT LOOP
 *
 * Iterative refinement using Mazur Framework judges.
 * Up to N iterations, with Mastra tracing via withSpan.
 *
 * The loop continues until:
 * 1. Quality threshold reached (default 0.85)
 * 2. Max iterations hit (default 20)
 * 3. Score regresses (early exit)
 * 4. Improvement delta too small
 */

import { generateText, generateObject } from 'ai'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { getGenerationModel, getJudgingModel, MODELS, IMPROVEMENT_LOOP, PERSONAS } from '../models'
import { withSpan, createAgentTrace } from '../../observability'
import { judgeMazur, MazurJudgment } from './mazur-judge'

// =============================================================================
// LOOP CONFIGURATION
// =============================================================================

export interface ImprovementLoopConfig {
  maxIterations?: number
  qualityThreshold?: number
  minImprovementDelta?: number
  earlyExitOnRegression?: boolean
  traceId?: string
  projectId?: string
  /** Called after each iteration for UI updates */
  onIteration?: (iteration: IterationResult) => void
}

export interface IterationResult {
  iteration: number
  content: string
  judgment: MazurJudgment
  improved: boolean
  delta: number
  reasoning: string
}

export interface LoopResult {
  finalContent: string
  finalScore: number
  iterations: IterationResult[]
  totalIterations: number
  converged: boolean
  exitReason: 'threshold_reached' | 'max_iterations' | 'regression' | 'delta_too_small'
  traceId: string
}

// =============================================================================
// REFINEMENT PROMPT BUILDER
// =============================================================================

function buildRefinementPrompt(
  content: string,
  judgment: MazurJudgment,
  iterationNumber: number
): string {
  const weakest = judgment.refinementPriority[0]
  const personaMap: Record<string, keyof typeof PERSONAS> = {
    depth: 'george-rr-martin',
    structure: 'vince-gilligan',
    feeling: 'david-lynch',
    originality: 'ursula-le-guin',
  }
  const persona = PERSONAS[personaMap[weakest] || 'george-rr-martin']

  const dimensionVerb: Record<string, string> = {
    DEPTH: 'REAL',
    STRUCTURE: 'WORK',
    FEELING: 'HAUNT',
    ORIGINALITY: 'NECESSARY',
  }

  return `# ITERATION ${iterationNumber} - REFINEMENT REQUIRED

## CURRENT SCORES
- Depth (GRRM): ${judgment.depth.score.toFixed(2)} ${judgment.depth.passes ? '✓' : '✗'}
- Structure (Gilligan): ${judgment.structure.score.toFixed(2)} ${judgment.structure.passes ? '✓' : '✗'}
- Feeling (Lynch): ${judgment.feeling.score.toFixed(2)} ${judgment.feeling.passes ? '✓' : '✗'}
- Originality (Le Guin): ${judgment.originality.score.toFixed(2)} ${judgment.originality.passes ? '✓' : '✗'}
- Overall: ${judgment.overallScore.toFixed(2)}
- Slop Score: ${judgment.slopScore.toFixed(2)} (lower is better)

## PRIORITY: FIX ${weakest.toUpperCase()} (${persona.question})

### Weaknesses to Address:
${judgment[weakest].weaknesses.map(w => `- ${w}`).join('\n')}

### Slop Detected:
${judgment[weakest].slopDetected.map(s => `- ⚠️ ${s}`).join('\n') || '- None detected'}

### ${persona.name}'s Critique:
"${judgment[weakest].quote}"

### Suggestion:
${judgment[weakest].suggestion}

## CURRENT CONTENT
${content}

## YOUR TASK
Rewrite this content to address the weaknesses above.
Channel ${persona.name}'s voice. Make it ${dimensionVerb[persona.dimension] || 'BETTER'}.

RULES:
- No hedging language ("It's worth noting...")
- No generic descriptions - be SPECIFIC
- No convenient resolutions
- Show don't tell
- Every choice has consequences
- Leave some mystery
- Cut any sentence that could belong to ANY story - make it specific to THIS one
- Add or sharpen one creative risk or moment of invention—a detail, choice, or turn that could only exist in this story and that might surprise the reader. Don't just fix weaknesses; make one thing bolder.

Output the refined content only, no explanation.`
}

// =============================================================================
// PLANNING/REASONING STEP (Cursor-style)
// =============================================================================

const PlanningSchema = z.object({
  analysis: z.string().describe('What are the main issues?'),
  strategy: z.string().describe('How will we fix them?'),
  changes: z.array(
    z.object({
      target: z.string().describe('What section to change'),
      from: z.string().describe('Current problematic text'),
      to: z.string().describe('What to change it to'),
      why: z.string().describe('Why this helps'),
    })
  ),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe('How confident are we this will improve the score?'),
})

async function planRefinement(
  content: string,
  judgment: MazurJudgment,
  traceId: string
): Promise<z.infer<typeof PlanningSchema>> {
  return withSpan(traceId, 'ImprovementLoop.plan', async span => {
    const model = getJudgingModel('primary')

    const prompt = `You are planning how to improve this content based on the Mazur Framework judgment.

SCORES:
- Depth: ${judgment.depth.score.toFixed(2)}
- Structure: ${judgment.structure.score.toFixed(2)}  
- Feeling: ${judgment.feeling.score.toFixed(2)}
- Slop: ${judgment.slopScore.toFixed(2)}

ALL WEAKNESSES:
${[...judgment.depth.weaknesses, ...judgment.structure.weaknesses, ...judgment.feeling.weaknesses, ...judgment.originality.weaknesses]
  .map(w => `- ${w}`)
  .join('\n')}

ALL SLOP SIGNALS:
${[
  ...judgment.depth.slopDetected,
  ...judgment.structure.slopDetected,
  ...judgment.feeling.slopDetected,
  ...judgment.originality.slopDetected,
]
  .map(s => `- ${s}`)
  .join('\n')}

CONTENT:
${content}

Plan specific changes that will improve the score. Focus on the weakest dimension first.`

    const result = await generateObject({
      model,
      schema: PlanningSchema,
      prompt,
      temperature: MODELS.judging.temperature,
    })

    span.end({ output: result.object })
    return result.object
  })
}

// =============================================================================
// MAIN IMPROVEMENT LOOP
// =============================================================================

export async function runImprovementLoop(
  initialContent: string,
  config: ImprovementLoopConfig = {}
): Promise<LoopResult> {
  const {
    maxIterations = IMPROVEMENT_LOOP.maxIterations,
    qualityThreshold = IMPROVEMENT_LOOP.qualityThreshold,
    minImprovementDelta = IMPROVEMENT_LOOP.minImprovementDelta,
    earlyExitOnRegression = IMPROVEMENT_LOOP.earlyExitOnRegression,
    traceId = uuidv4(),
    projectId,
    onIteration,
  } = config

  createAgentTrace({
    traceId,
    agentName: 'ImprovementLoop',
    projectId,
  })

  const iterations: IterationResult[] = []
  let currentContent = initialContent
  let previousScore = 0
  let exitReason: LoopResult['exitReason'] = 'max_iterations'

  for (let i = 1; i <= maxIterations; i++) {
    await withSpan(traceId, `iteration_${i}`, async span => {
      // === STEP 1: Judge current content ===
      const judgment = await judgeMazur(currentContent, traceId)

      const delta = judgment.overallScore - previousScore
      const improved = delta > 0

      const iterationResult: IterationResult = {
        iteration: i,
        content: currentContent,
        judgment,
        improved,
        delta,
        reasoning:
          `Score: ${judgment.overallScore.toFixed(3)} (${improved ? '+' : ''}${delta.toFixed(3)}). ` +
          `Verdict: ${judgment.verdict}. Priority: ${judgment.refinementPriority[0]}`,
      }

      iterations.push(iterationResult)
      onIteration?.(iterationResult)

      // === CHECK EXIT CONDITIONS ===

      // 1. Quality threshold reached
      if (judgment.overallScore >= qualityThreshold && judgment.slopScore < 0.2) {
        exitReason = 'threshold_reached'
        span.end({ output: { exit: 'threshold_reached' } })
        return
      }

      // 2. Regression detected
      if (earlyExitOnRegression && i > 1 && delta < 0) {
        exitReason = 'regression'
        // Revert to previous content
        currentContent = iterations[i - 2].content
        span.end({ output: { exit: 'regression' } })
        return
      }

      // 3. Delta too small (plateau)
      if (i > 2 && Math.abs(delta) < minImprovementDelta) {
        exitReason = 'delta_too_small'
        span.end({ output: { exit: 'delta_too_small' } })
        return
      }

      // === STEP 2: Plan refinement (Cursor-style reasoning) ===
      if (judgment.verdict !== 'PASS') {
        await planRefinement(currentContent, judgment, traceId)

        // === STEP 3: Execute refinement ===
        const model = getGenerationModel('creative')
        const refinementPrompt = buildRefinementPrompt(currentContent, judgment, i)

        const refined = await generateText({
          model,
          prompt: refinementPrompt,
          temperature: 0.4,
        })

        currentContent = refined.text
        previousScore = judgment.overallScore
      }

      span.end({ output: { score: judgment.overallScore, delta } })
    })

    // Check if we should exit (set by inner function)
    if (exitReason !== 'max_iterations') break
  }

  // Final judgment
  const finalJudgment = iterations[iterations.length - 1].judgment

  return {
    finalContent: currentContent,
    finalScore: finalJudgment.overallScore,
    iterations,
    totalIterations: iterations.length,
    converged: exitReason === 'threshold_reached',
    exitReason,
    traceId,
  }
}

// =============================================================================
// QUICK IMPROVEMENT (Single pass with judgment)
// =============================================================================
