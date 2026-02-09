import { NextRequest, NextResponse } from 'next/server'
import { Langfuse } from 'langfuse'
import { getErrorMessage } from '@/lib/error-utils'

// Initialize Langfuse client for fetching data
function getLangfuseClient() {
  return new Langfuse({
    publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
    secretKey: process.env.LANGFUSE_SECRET_KEY!,
    baseUrl: process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com',
  })
}

export async function GET(request: NextRequest) {
  try {
    const langfuseConfig = {
      baseUrl: process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com',
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      projectId: process.env.LANGFUSE_PROJECT_ID,
      configured: !!(process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY),
    }

    // Build dashboard URLs for various Langfuse features
    const projectId = langfuseConfig.projectId || 'default'
    const baseUrl = langfuseConfig.baseUrl

    const urls = langfuseConfig.configured
      ? {
          traces: `${baseUrl}/project/${projectId}/traces`,
          tracesWithScores: `${baseUrl}/project/${projectId}/traces?filter=hasScore%3Atrue`,
          tracesStoryteller: `${baseUrl}/project/${projectId}/traces?filter=tags%3Astoryteller`,
          evals: `${baseUrl}/project/${projectId}/evals`,
          scores: `${baseUrl}/project/${projectId}/scores`,
          llmConnections: `${baseUrl}/project/${projectId}/settings/llm-connection`,
          datasets: `${baseUrl}/project/${projectId}/datasets`,
        }
      : null

    // Setup instructions for Langfuse LLM-as-a-Judge
    const setupInstructions = langfuseConfig.configured
      ? [
          {
            step: 1,
            title: 'Configure LLM Connection',
            description: 'Add your OpenAI API key to Langfuse so it can run LLM evaluations',
            url: urls?.llmConnections,
            action: 'Go to Settings > LLM Connection > Add OpenAI key',
          },
          {
            step: 2,
            title: 'Create an Evaluator',
            description: 'Set up an LLM-as-a-Judge evaluator for your traces',
            url: urls?.evals,
            action: 'Go to Evals > "+ Set up Evaluator" > Choose template or create custom',
          },
          {
            step: 3,
            title: 'Configure Trace Filter',
            description:
              'Select which traces to evaluate (e.g., filter by tag "storyteller" or "agent")',
            action:
              'In evaluator setup, filter by: tags contains "storyteller" or name contains "Agent"',
          },
          {
            step: 4,
            title: 'Map Variables',
            description: 'Map trace input/output to evaluator variables',
            action: 'Map {{input}} to trace.input, {{output}} to trace.output',
          },
        ]
      : [
          {
            step: 1,
            title: 'Configure Langfuse',
            description: 'Set environment variables for Langfuse',
            action:
              'Add LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY, LANGFUSE_BASE_URL, LANGFUSE_PROJECT_ID to .env',
          },
        ]

    // Evaluator templates for storyteller
    const evaluatorTemplates = [
      {
        name: 'Storyteller Quality',
        description: 'Evaluate narrative quality, character consistency, and emotional resonance',
        prompt: `You are evaluating AI-generated storytelling content.

## Content to Evaluate
Input: {{input}}
Output: {{output}}

## Evaluation Criteria
1. **Narrative Coherence** (0-10): Does the story flow logically?
2. **Character Consistency** (0-10): Do characters act according to their established traits?
3. **Emotional Resonance** (0-10): Does the content evoke genuine emotion?
4. **Creative Quality** (0-10): Is the writing engaging and original?

Respond with JSON:
{
  "narrative_coherence": <0-10>,
  "character_consistency": <0-10>,
  "emotional_resonance": <0-10>,
  "creative_quality": <0-10>,
  "overall_score": <0-10>,
  "reasoning": "<explanation>"
}`,
        filterSuggestion: 'tags contains "storyteller"',
      },
      {
        name: 'Anti-Slop Detector',
        description: 'Detect AI clichés and overused phrases',
        prompt: `Analyze this AI-generated text for "slop" - overused AI writing patterns.

## Text to Analyze
{{output}}

## Slop Indicators
- Purple prose ("vast expanse", "myriad of")
- Cliché openers ("In a world where...")
- Overused adjectives ("profound", "intricate", "nuanced")
- Excessive hedging ("It's worth noting that...")
- AI tells ("This suggests that...", "It's important to consider...")

Rate 0-10 where 10 = no slop detected, 0 = heavy slop.

Respond with JSON:
{
  "slop_score": <0-10>,
  "detected_patterns": ["<pattern1>", "<pattern2>"],
  "examples": ["<quote1>", "<quote2>"],
  "reasoning": "<explanation>"
}`,
        filterSuggestion: 'observation.type = "generation"',
      },
    ]

    if (langfuseConfig.configured) {
      const langfuse = getLangfuseClient()
      await langfuse.flush()
    }

    return NextResponse.json({
      configured: langfuseConfig.configured,
      baseUrl: langfuseConfig.baseUrl,
      projectId,
      urls,
      setupInstructions,
      evaluatorTemplates,
      dashboardUrl: urls?.traces,
      message: langfuseConfig.configured
        ? 'Langfuse is configured. Follow the setup instructions to enable LLM-as-a-Judge evaluations in the Evals tab.'
        : 'Langfuse is not configured. Set LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY environment variables.',
      note: 'The Langfuse Evals tab requires evaluators to be configured in the Langfuse UI. Scores recorded via SDK appear in Traces and Score Analytics.',
    })
  } catch (error: unknown) {
    console.error('Error checking Langfuse config:', error)
    return NextResponse.json(
      { error: getErrorMessage(error) || 'Failed to check Langfuse configuration' },
      { status: 500 }
    )
  }
}
