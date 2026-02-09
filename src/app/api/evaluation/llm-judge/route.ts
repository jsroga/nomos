import { NextRequest, NextResponse } from 'next/server'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { langfuse } from '@/agent-core/observability'
import { v4 as uuidv4 } from 'uuid'
import { ConfidentAIClient, getTestRunUrl, LLMTestCase } from '@/evaluation/confident-ai/client'
import { spawn } from 'child_process'
import * as path from 'path'
import { withAuth, type AuthenticatedRequest } from '@/lib/api-utils'

function runPythonScript(scriptPath: string, input: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const process = spawn('python3', [scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    process.stdout.on('data', data => {
      stdout += data.toString()
    })

    process.stderr.on('data', data => {
      stderr += data.toString()
    })

    process.on('close', code => {
      if (code === 0) {
        resolve(stdout)
      } else {
        reject(new Error(stderr || `Process exited with code ${code}`))
      }
    })

    process.on('error', err => {
      reject(err)
    })

    // Write input to stdin and close it
    process.stdin.write(input)
    process.stdin.end()

    // Timeout after 2 minutes
    setTimeout(() => {
      process.kill()
      reject(new Error('Evaluation timeout'))
    }, 120000)
  })
}

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  agentName?: string
  thinking?: string
}

interface EvaluationRequest {
  conversation: ConversationMessage[]
  criteria: string[]
  projectId?: string
  useConfidentAI?: boolean
}

interface CriteriaScore {
  score: number
  comment: string
}

interface EvaluationResult {
  score: number
  feedback: string
  criteria: Record<string, CriteriaScore>
  traceId: string
  confidentAIUrl?: string
}

// Different model for evaluation to ensure unbiased judgment
const JUDGE_MODEL = 'gpt-4o' // Using a different model instance for evaluation

// Metric collection for quick in-chat evaluation
const CONFIDENT_AI_COLLECTION = 'Storyteller Quick v3'

// Polling settings for Confident AI
const MAX_POLL_ATTEMPTS = 30
const POLL_INTERVAL_MS = 2000

const CRITERIA_DESCRIPTIONS: Record<string, string> = {
  narrative_coherence: 'Does the story flow logically? Are there plot holes or contradictions?',
  character_consistency:
    'Do characters behave consistently with their established traits and motivations?',
  creative_quality: 'Is the writing engaging, original, and well-crafted?',
  user_goal_alignment: 'Did the AI help the user achieve their stated goals effectively?',
  pacing_and_structure: 'Is the story paced well? Does the structure support the narrative?',
}

export const POST = withAuth(async (request: NextRequest, _auth: AuthenticatedRequest) => {
  try {
    const body: EvaluationRequest = await request.json()
    const { conversation, criteria, projectId } = body

    if (!conversation || conversation.length === 0) {
      return NextResponse.json({ error: 'No conversation provided' }, { status: 400 })
    }

    const traceId = uuidv4()

    // Create Langfuse trace for the evaluation
    langfuse.trace({
      id: traceId,
      name: 'LLM-as-Judge Evaluation',
      metadata: {
        projectId,
        conversationLength: conversation.length,
        criteria,
      },
      tags: ['evaluation', 'llm-judge'],
    })

    // Check evaluation mode:
    // 1. CONFIDENT_API_KEY set -> Use Confident AI cloud
    // 2. DEEPEVAL_LOCAL=true -> Use local Python DeepEval
    // 3. Otherwise -> Fallback to local GPT-4o evaluation
    const confidentAIKey = process.env.CONFIDENT_API_KEY || process.env.CONFIDENT_AI_API_KEY
    const useLocalDeepeval = process.env.DEEPEVAL_LOCAL === 'true'

    if (confidentAIKey) {
      // Use Confident AI for scientific evaluation
      return await evaluateWithConfidentAI(conversation, traceId, confidentAIKey)
    } else if (useLocalDeepeval) {
      // Use local Python DeepEval (no cloud account needed)
      return await evaluateWithLocalDeepeval(conversation, traceId)
    } else {
      // Fallback to local GPT-4o evaluation
      return await evaluateWithLocalLLM(conversation, criteria, traceId)
    }
  } catch (error) {
    console.error('Evaluation error:', error)
    return NextResponse.json({ error: 'Evaluation failed' }, { status: 500 })
  }
})

/**
 * Evaluate using Confident AI's scientific metrics (EQ-Bench, Mazur, Gilligan)
 */
async function evaluateWithConfidentAI(
  conversation: ConversationMessage[],
  traceId: string,
  apiKey: string
): Promise<NextResponse> {
  const client = new ConfidentAIClient({ apiKey })

  // Build context from conversation
  const userMessages = conversation.filter(m => m.role === 'user').map(m => m.content)
  const lastAssistantMessage = [...conversation].reverse().find(m => m.role === 'assistant')

  if (!lastAssistantMessage) {
    return NextResponse.json({ error: 'No assistant response to evaluate' }, { status: 400 })
  }

  // Create test case for evaluation
  const testCase: LLMTestCase = {
    input: userMessages.join('\n---\n'),
    actualOutput: lastAssistantMessage.content,
    context: conversation.map(m => `${m.role}: ${m.content.slice(0, 500)}`),
  }

  const span = langfuse.span({
    traceId,
    name: 'confident-ai-evaluation',
    input: {
      testCase: { input: testCase.input.slice(0, 200), outputLength: testCase.actualOutput.length },
    },
  })

  try {
    // Submit evaluation to Confident AI
    const evalResponse = await client.evaluate({
      metricCollection: CONFIDENT_AI_COLLECTION,
      llmTestCases: [testCase],
      identifier: `chat-eval-${traceId}`,
    })

    if (!evalResponse.success) {
      throw new Error('Confident AI evaluation submission failed')
    }

    const testRunId = evalResponse.data.id

    // Poll for results
    let testRunDetails = null
    let projectId: string | undefined
    for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))

      try {
        const details = await client.getTestRun(testRunId)
        // projectId is nested in testCases[0].metricsData[0].projectId
        projectId = (details.data as any)?.testCases?.[0]?.metricsData?.[0]?.projectId
        if (details.success && details.data.status === 'FINISHED') {
          testRunDetails = details.data
          break
        }
      } catch {
        // Continue polling
      }
    }

    const confidentAIUrl = getTestRunUrl(testRunId, projectId)

    span.end({
      output: { testRunId, status: testRunDetails?.status || 'polling_timeout' },
      metadata: { confidentAIUrl },
    })

    // Build result from Confident AI response
    const result: EvaluationResult = {
      score: 0,
      feedback: '',
      criteria: {},
      traceId,
      confidentAIUrl,
    }

    if (testRunDetails && testRunDetails.testCases?.[0]?.metricData) {
      const metricData = testRunDetails.testCases[0].metricData

      // Calculate overall score as average
      const scores = metricData.map(m => m.score)
      result.score = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10

      // Map individual metrics
      for (const metric of metricData) {
        const key = metric.name.toLowerCase().replace(/[^a-z0-9]/g, '_')
        result.criteria[key] = {
          score: Math.round(metric.score * 10),
          comment: metric.reason || (metric.success ? 'Passed' : 'Failed'),
        }
      }

      result.feedback = `Evaluated using scientific metrics (EQ-Bench, Mazur, Gilligan). View detailed results: ${confidentAIUrl}`
    } else {
      result.feedback = `Evaluation submitted to Confident AI. Results available at: ${confidentAIUrl}`
      result.score = 0
    }

    // Record scores to Langfuse
    langfuse.score({
      traceId,
      name: 'confident_ai_overall',
      value: result.score,
      comment: result.feedback,
    })

    for (const [key, value] of Object.entries(result.criteria)) {
      langfuse.score({
        traceId,
        name: `confident_ai_${key}`,
        value: value.score / 10,
        comment: value.comment,
      })
    }

    await langfuse.flush()

    return NextResponse.json(result)
  } catch (error) {
    span.end({ output: { error: String(error) } })
    console.error('Confident AI evaluation error:', error)

    // Return partial result with URL if we have it
    return NextResponse.json({
      score: 0,
      feedback: 'Evaluation in progress. Check Confident AI dashboard for results.',
      criteria: {},
      traceId,
      confidentAIUrl: undefined,
    })
  }
}

/**
 * Evaluate using local Python DeepEval (no cloud account needed)
 * Requires: pip install deepeval
 */
async function evaluateWithLocalDeepeval(
  conversation: ConversationMessage[],
  traceId: string
): Promise<NextResponse> {
  const userMessages = conversation.filter(m => m.role === 'user').map(m => m.content)
  const lastAssistantMessage = [...conversation].reverse().find(m => m.role === 'assistant')

  if (!lastAssistantMessage) {
    return NextResponse.json({ error: 'No assistant response to evaluate' }, { status: 400 })
  }

  const span = langfuse.span({
    traceId,
    name: 'local-deepeval-evaluation',
    input: { conversationLength: conversation.length },
  })

  try {
    // Prepare input for Python script
    const evalInput = {
      input: userMessages.join('\n---\n'),
      output: lastAssistantMessage.content,
      context: conversation.map(m => `${m.role}: ${m.content.slice(0, 500)}`),
    }

    // Get the script path
    const scriptPath = path.join(process.cwd(), 'scripts', 'deepeval-local.py')

    // Run Python script with JSON input via stdin
    const stdout = await runPythonScript(scriptPath, JSON.stringify(evalInput))

    const result = JSON.parse(stdout)

    span.end({
      output: { score: result.score, metricsCount: Object.keys(result.criteria).length },
      metadata: { method: 'local-deepeval' },
    })

    // Add local flag to feedback
    result.feedback = `Local DeepEval: ${result.feedback}`
    result.traceId = traceId

    // Record scores to Langfuse
    langfuse.score({
      traceId,
      name: 'deepeval_local_overall',
      value: result.score,
      comment: result.feedback,
    })

    for (const [key, value] of Object.entries(result.criteria)) {
      const v = value as { score: number; comment: string }
      langfuse.score({
        traceId,
        name: `deepeval_${key}`,
        value: v.score / 10,
        comment: v.comment,
      })
    }

    await langfuse.flush()

    return NextResponse.json(result)
  } catch (error) {
    span.end({ output: { error: String(error) } })
    console.error('Local DeepEval error:', error)

    // Check if it's a "deepeval not installed" error
    const errorStr = String(error)
    if (errorStr.includes('deepeval not installed') || errorStr.includes('No module named')) {
      return NextResponse.json(
        {
          error: 'DeepEval not installed. Run: pip install deepeval',
          score: 0,
          feedback: 'DeepEval not installed. Run: pip install deepeval',
          criteria: {},
          traceId,
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        error: 'Local DeepEval evaluation failed',
        score: 0,
        feedback: `Local DeepEval failed: ${errorStr}`,
        criteria: {},
        traceId,
      },
      { status: 500 }
    )
  }
}

/**
 * Fallback evaluation using local GPT-4o (when Confident AI is not configured)
 */
async function evaluateWithLocalLLM(
  conversation: ConversationMessage[],
  criteria: string[],
  traceId: string
): Promise<NextResponse> {
  // Format conversation for evaluation
  const formattedConversation = conversation
    .map((msg, i) => {
      const prefix = msg.role === 'user' ? 'USER' : `AI (${msg.agentName || 'Assistant'})`
      return `[${i + 1}] ${prefix}:\n${msg.content}`
    })
    .join('\n\n---\n\n')

  // Build evaluation prompt
  const evaluationPrompt = `You are an expert evaluator assessing the quality of an AI storytelling assistant's conversation.

## Conversation to Evaluate:
${formattedConversation}

## Evaluation Criteria:
${criteria.map(c => `- **${c.replace(/_/g, ' ')}**: ${CRITERIA_DESCRIPTIONS[c] || 'Evaluate this aspect.'}`).join('\n')}

## Your Task:
Evaluate the conversation and provide:
1. A score from 1-10 for each criterion
2. A brief comment explaining each score
3. An overall score (1-10) that weights all criteria
4. A summary feedback paragraph

## Response Format (JSON):
{
  "overall_score": <number 1-10>,
  "overall_feedback": "<summary feedback paragraph>",
  "criteria_scores": {
    "<criterion_name>": {
      "score": <number 1-10>,
      "comment": "<brief explanation>"
    }
  }
}

Be critical but fair. Consider:
- Did the AI understand and address user needs?
- Was the creative output of high quality?
- Were there any issues with consistency or logic?
- Did the conversation flow naturally?

Respond ONLY with the JSON object.`

  // Create OpenAI instance for evaluation (separate from the main model)
  const openai = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })

  const span = langfuse.span({
    traceId,
    name: 'llm-judge-generation',
    input: { conversationLength: conversation.length, criteria },
  })

  // Generate evaluation
  const response = await generateText({
    model: openai(JUDGE_MODEL),
    prompt: evaluationPrompt,
    temperature: 0.3, // Lower temperature for more consistent evaluations
  })

  span.end({
    output: { text: response.text.slice(0, 500) },
    metadata: { model: JUDGE_MODEL },
  })

  // Parse the response
  let evaluation: any
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      evaluation = JSON.parse(jsonMatch[0])
    } else {
      throw new Error('No JSON found in response')
    }
  } catch {
    console.error('Failed to parse evaluation response:', response.text)
    return NextResponse.json({ error: 'Failed to parse evaluation response' }, { status: 500 })
  }

  // Format the result
  const result: EvaluationResult = {
    score: evaluation.overall_score || 0,
    feedback: evaluation.overall_feedback || 'No feedback provided',
    criteria: {},
    traceId,
  }

  // Map criteria scores
  if (evaluation.criteria_scores) {
    for (const [key, value] of Object.entries(evaluation.criteria_scores)) {
      const v = value as CriteriaScore
      result.criteria[key] = {
        score: v.score || 0,
        comment: v.comment || '',
      }
    }
  }

  // Add score to trace
  langfuse.score({
    traceId,
    name: 'overall_quality',
    value: result.score,
    comment: result.feedback,
  })

  // Add individual criteria scores
  for (const [key, value] of Object.entries(result.criteria)) {
    langfuse.score({
      traceId,
      name: key,
      value: value.score,
      comment: value.comment,
    })
  }

  // Flush to ensure scores are recorded
  await langfuse.flush()

  return NextResponse.json(result)
}
