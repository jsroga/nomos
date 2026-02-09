/**
 * Conversation Simulator for Hypothesis Experiments
 *
 * Executes multi-turn conversations using the Storyteller agent
 * and captures all tool calls and outputs for evaluation.
 */

import { v4 as uuidv4 } from 'uuid'
import { createStorytellerAgent } from '@/domains/storyteller/agents/v2/storyteller-agent'
import { langfuse } from '@/agent-core/observability'
import {
  Hypothesis,
  ConversationTurn,
  ExecutedTurn,
  SimulationResult,
  CapturedToolCall,
  OutputScope,
} from './types'
import {
  captureOutputsFromToolCalls,
  serializeOutputsForEvaluation,
  buildContextFromOutputs,
} from './output-capture'

// ============================================
// Configuration
// ============================================

interface SimulatorConfig {
  /** Project ID for the simulation (creates new if not provided) */
  projectId?: string
  /** Episode ID for the simulation (creates new if not provided) */
  episodeId?: string
  /** Model to use */
  model?: string
  /** Temperature for generation */
  temperature?: number
  /** Top P for generation */
  topP?: number
  /** Enable tracing to Langfuse */
  enableTracing?: boolean
  /** Verbose logging */
  verbose?: boolean
}

const DEFAULT_CONFIG: SimulatorConfig = {
  model: 'openai:gpt-4o-mini',
  temperature: 0.85,
  topP: 0.95,
  enableTracing: true,
  verbose: false,
  // Use existing project so DB calls succeed
  projectId: 'd3fd7ace-3a7d-4b29-9fd6-1f4ddc7a7973',
}

// Circuit breaker: max consecutive errors before aborting
const MAX_CONSECUTIVE_ERRORS = 3
let consecutiveErrors = 0

// ============================================
// Conversation Simulator
// ============================================

/**
 * Execute a single conversation turn
 */
async function executeTurn(
  agent: Awaited<ReturnType<typeof createStorytellerAgent>>,
  turn: ConversationTurn,
  context: string,
  traceId: string,
  config: SimulatorConfig
): Promise<ExecutedTurn> {
  const startTime = Date.now()
  const toolCalls: CapturedToolCall[] = []
  let response = ''
  let error: string | undefined

  try {
    // Build the full prompt with context
    const prompt = turn.role === 'user' ? `${context}\n\nUser: ${turn.content}` : turn.content

    // Run the agent
    const result = await agent.run(
      prompt,
      '', // Additional context already in prompt
      traceId,
      'auto',
      {
        temperature: config.temperature,
        topP: config.topP,
      }
    )

    response = result
    consecutiveErrors = 0 // Reset circuit breaker on success

    // Extract tool calls from the result
    // Note: In a real implementation, we'd need to intercept tool calls during execution
    // For now, we parse tool mentions from the response
    const toolCallMatches = response.matchAll(/Tool called: (\w+)/g)
    for (const match of toolCallMatches) {
      toolCalls.push({
        name: match[1],
        args: {},
        timestamp: Date.now(),
      })
    }
  } catch (err) {
    error = err instanceof Error ? err.message : String(err)
    consecutiveErrors++

    // Circuit breaker: abort if too many consecutive errors
    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      console.error(
        `\n🛑 CIRCUIT BREAKER: ${consecutiveErrors} consecutive errors. Aborting to prevent cost overrun.`
      )
      throw new Error(`Circuit breaker triggered: ${consecutiveErrors} consecutive errors`)
    }

    if (config.verbose) {
      console.error(`  Error in turn: ${error}`)
    }
  }

  return {
    planned: turn,
    response,
    toolCalls,
    durationMs: Date.now() - startTime,
    error,
  }
}

/**
 * Build initial context for the simulation
 */
function buildInitialContext(
  hypothesis: Hypothesis,
  version: 'baseline' | 'variant',
  config: SimulatorConfig
): string {
  const variable = hypothesis.variable
  const value = version === 'baseline' ? variable.baseline : variable.variant

  let contextParts: string[] = [
    'SYSTEM CONTEXT:',
    `- ProjectId: ${config.projectId || 'simulation-project'}`,
    `- EpisodeId: ${config.episodeId || 'simulation-episode'}`,
    '- Phase: premise',
    '',
    'HYPOTHESIS EXPERIMENT:',
    `- Name: ${hypothesis.name}`,
    `- Variable Type: ${variable.type}`,
    `- Testing: ${version}`,
  ]

  // Apply variable based on type
  if (variable.type === 'prompt') {
    contextParts.push(`- Prompt Modification: ${value}`)
  } else if (variable.type === 'model_param') {
    const params = value as Record<string, unknown>
    if (params.temperature !== undefined) {
      config.temperature = params.temperature as number
    }
    if (params.topP !== undefined) {
      config.topP = params.topP as number
    }
    contextParts.push(`- Model Parameters: ${JSON.stringify(params)}`)
  }

  return contextParts.join('\n')
}

/**
 * Run a full conversation simulation
 */
export async function runSimulation(
  hypothesis: Hypothesis,
  messageFlow: ConversationTurn[],
  outputScope: OutputScope[],
  version: 'baseline' | 'variant',
  config: SimulatorConfig = {}
): Promise<SimulationResult> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config }
  const startTime = Date.now()
  const traceId = uuidv4()

  if (mergedConfig.verbose) {
    console.log(`\n🧪 Running simulation: ${hypothesis.name} (${version})`)
    console.log(`   Trace ID: ${traceId}`)
    console.log(`   Turns: ${messageFlow.length}`)
  }

  // Create Langfuse trace if enabled
  if (mergedConfig.enableTracing) {
    langfuse.trace({
      id: traceId,
      name: `Hypothesis Simulation: ${hypothesis.name}`,
      metadata: {
        hypothesis: hypothesis.id,
        version,
        messageCount: messageFlow.length,
        outputScope,
      },
      tags: ['hypothesis', 'simulation', version],
    })
  }

  // Create the storyteller agent
  const agent = await createStorytellerAgent(mergedConfig.model, true)

  // Build initial context
  const initialContext = buildInitialContext(hypothesis, version, mergedConfig)

  // Execute each turn
  const executedTurns: ExecutedTurn[] = []
  const allToolCalls: CapturedToolCall[] = []
  let accumulatedContext = initialContext

  for (let i = 0; i < messageFlow.length; i++) {
    const turn = messageFlow[i]

    if (mergedConfig.verbose) {
      console.log(
        `   [${i + 1}/${messageFlow.length}] ${turn.role}: ${turn.content.slice(0, 50)}...`
      )
    }

    const executed = await executeTurn(agent, turn, accumulatedContext, traceId, mergedConfig)

    executedTurns.push(executed)
    allToolCalls.push(...executed.toolCalls)

    // Update accumulated context with the response
    if (turn.role === 'user' && executed.response) {
      accumulatedContext += `\n\nAssistant: ${executed.response.slice(0, 500)}...`
    }

    // Record span if tracing
    if (mergedConfig.enableTracing) {
      langfuse.span({
        traceId,
        name: `Turn ${i + 1}: ${turn.role}`,
        input: { content: turn.content.slice(0, 200) },
        output: { response: executed.response.slice(0, 500), error: executed.error },
        metadata: {
          toolCalls: executed.toolCalls.length,
          durationMs: executed.durationMs,
        },
      })
    }
  }

  // Capture outputs from tool calls
  const capturedOutputs = captureOutputsFromToolCalls(allToolCalls, outputScope)

  // Also try to extract script content from responses
  if (outputScope.includes('script')) {
    const scriptContent = executedTurns
      .filter(t => t.planned.role === 'user' && t.planned.content.toLowerCase().includes('write'))
      .map(t => t.response)
      .join('\n\n')

    if (scriptContent) {
      capturedOutputs.script = scriptContent
    }
  }

  const result: SimulationResult = {
    hypothesis,
    version,
    turns: executedTurns,
    capturedOutputs,
    rawToolCalls: allToolCalls,
    durationMs: Date.now() - startTime,
    timestamp: new Date().toISOString(),
  }

  if (mergedConfig.verbose) {
    console.log(`   ✓ Completed in ${result.durationMs}ms`)
    console.log(`   Tool calls: ${allToolCalls.length}`)
  }

  // Flush traces
  if (mergedConfig.enableTracing) {
    await langfuse.flush()
  }

  return result
}

/**
 * Run A/B simulation (baseline + variant)
 */
export async function runABSimulation(
  hypothesis: Hypothesis,
  messageFlow: ConversationTurn[],
  outputScope: OutputScope[],
  config: SimulatorConfig = {}
): Promise<{
  baseline: SimulationResult
  variant: SimulationResult
}> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config }

  if (mergedConfig.verbose) {
    console.log('\n═══════════════════════════════════════════════════════════')
    console.log(`  🧪 A/B Simulation: ${hypothesis.name}`)
    console.log('═══════════════════════════════════════════════════════════')
  }

  // Run baseline
  if (mergedConfig.verbose) {
    console.log('\n📊 Running BASELINE...')
  }
  const baseline = await runSimulation(
    hypothesis,
    messageFlow,
    outputScope,
    'baseline',
    mergedConfig
  )

  // Run variant
  if (mergedConfig.verbose) {
    console.log('\n📊 Running VARIANT...')
  }
  const variant = await runSimulation(hypothesis, messageFlow, outputScope, 'variant', mergedConfig)

  if (mergedConfig.verbose) {
    console.log('\n═══════════════════════════════════════════════════════════')
    console.log('  ✅ A/B Simulation Complete')
    console.log(`  Baseline: ${baseline.durationMs}ms, ${baseline.rawToolCalls.length} tool calls`)
    console.log(`  Variant: ${variant.durationMs}ms, ${variant.rawToolCalls.length} tool calls`)
    console.log('═══════════════════════════════════════════════════════════')
  }

  return { baseline, variant }
}

/**
 * Convert simulation result to DeepEval test case
 */
export function simulationToTestCase(
  simulation: SimulationResult,
  outputScope: OutputScope[]
): {
  input: string
  actualOutput: string
  context: string[]
} {
  // Build input from user messages
  const input = simulation.turns
    .filter(t => t.planned.role === 'user')
    .map(t => t.planned.content)
    .join('\n---\n')

  // Build actual output from captured outputs
  const actualOutput = serializeOutputsForEvaluation(simulation.capturedOutputs, outputScope)

  // Build context
  const context = buildContextFromOutputs(simulation.capturedOutputs)

  // Add hypothesis context
  context.unshift(`Hypothesis: ${simulation.hypothesis.name}`)
  context.unshift(`Version: ${simulation.version}`)

  return {
    input,
    actualOutput: actualOutput || 'No output captured',
    context,
  }
}
