/**
 * LANGFUSE EVALUATIONS RUNNER
 * 
 * Runs LLM-as-Judge evaluations on recent storyteller traces
 * and records scores to Langfuse.
 * 
 * Run: npx tsx scripts/run-langfuse-evals.ts
 */

import Anthropic from '@anthropic-ai/sdk'
import { Langfuse } from 'langfuse'

// Initialize clients
const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
  secretKey: process.env.LANGFUSE_SECRET_KEY!,
  baseUrl: process.env.LANGFUSE_BASE_URL || process.env.LANGFUSE_HOST || 'http://localhost:3001',
})

const anthropic = new Anthropic()

// Evaluation prompts (Mazur Framework inspired)
const EVALUATORS = {
  storytellerQuality: {
    name: 'storyteller-quality',
    prompt: `You are evaluating AI-generated storytelling content using the Mazur Framework.

## Content to Evaluate
Input: {{input}}
Output: {{output}}

## Evaluation Criteria (Mazur Framework)

### 1. GEORGE R.R. MARTIN - Depth & Consequence (0-10)
- Does the content have real stakes and consequences?
- Are characters making difficult choices?
- Is there moral complexity?

### 2. VINCE GILLIGAN - Structure & Inevitability (0-10)
- Is the narrative structure tight and purposeful?
- Do events feel inevitable in retrospect?
- Is there setup and payoff?

### 3. DAVID LYNCH - Feeling & Atmosphere (0-10)
- Does it create a unique emotional atmosphere?
- Is there subconscious resonance?
- Does it evoke genuine feeling?

### 4. ANTI-SLOP Score (0-10)
- Is the writing free of AI clichés?
- No purple prose, no "In a world where..."
- No overused phrases like "nuanced", "intricate", "tapestry"

Respond ONLY with JSON:
{
  "george_score": <0-10>,
  "vince_score": <0-10>,
  "david_score": <0-10>,
  "anti_slop_score": <0-10>,
  "overall_score": <0-10>,
  "reasoning": "<brief explanation>"
}`,
  },
  
  antiSlop: {
    name: 'anti-slop',
    prompt: `Analyze this AI-generated text for "slop" - overused AI writing patterns.

## Text to Analyze
{{output}}

## Slop Indicators (Rate each 0-10, 10 = no slop)
- Purple prose ("vast expanse", "myriad of", "tapestry of")
- Cliché openers ("In a world where...", "Little did they know...")
- Overused adjectives ("profound", "intricate", "nuanced", "captivating")
- Excessive hedging ("It's worth noting that...", "Interestingly,")
- AI tells ("This suggests that...", "It's important to consider...")
- Filler phrases ("at the end of the day", "when all is said and done")

Respond ONLY with JSON:
{
  "slop_score": <0-10 where 10 = no slop>,
  "detected_patterns": ["<pattern1>", "<pattern2>"],
  "examples": ["<quote1>", "<quote2>"],
  "reasoning": "<explanation>"
}`,
  },
}

interface TraceData {
  id: string
  name: string
  input: string
  output: string
  timestamp: string
}

async function fetchRecentTraces(): Promise<TraceData[]> {
  // Fetch recent traces via Langfuse API
  const response = await fetch(
    `${process.env.LANGFUSE_BASE_URL || 'http://localhost:3001'}/api/public/traces?limit=20`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${process.env.LANGFUSE_PUBLIC_KEY}:${process.env.LANGFUSE_SECRET_KEY}`).toString('base64')}`,
      },
    }
  )
  
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Failed to fetch traces: ${response.status} ${text}`)
  }
  
  const data = await response.json()
  
  // Filter for storyteller traces with output
  return (data.data || [])
    .filter((t: any) => t.output && (t.tags?.includes('storyteller') || t.name?.includes('storyteller') || t.name?.includes('Agent')))
    .map((t: any) => ({
      id: t.id,
      name: t.name || 'unknown',
      input: typeof t.input === 'string' ? t.input : JSON.stringify(t.input),
      output: typeof t.output === 'string' ? t.output : JSON.stringify(t.output),
      timestamp: t.timestamp,
    }))
}

async function runEvaluation(
  evaluator: typeof EVALUATORS.storytellerQuality,
  trace: TraceData
): Promise<{ scores: Record<string, number>; reasoning: string }> {
  const prompt = evaluator.prompt
    .replace('{{input}}', trace.input?.slice(0, 2000) || '(no input)')
    .replace('{{output}}', trace.output?.slice(0, 4000) || '(no output)')
  
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })
  
  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  
  // Parse JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('No JSON found in evaluation response')
  }
  
  const result = JSON.parse(jsonMatch[0])
  
  // Extract scores
  const scores: Record<string, number> = {}
  for (const [key, value] of Object.entries(result)) {
    if (typeof value === 'number' && key !== 'reasoning') {
      scores[key] = value
    }
  }
  
  return { scores, reasoning: result.reasoning || '' }
}

async function recordScores(
  traceId: string,
  evaluatorName: string,
  scores: Record<string, number>,
  reasoning: string
) {
  for (const [name, value] of Object.entries(scores)) {
    const scoreName = `${evaluatorName}/${name}`
    langfuse.score({
      traceId,
      name: scoreName,
      value: value / 10, // Normalize to 0-1
      comment: reasoning,
    })
    console.log(`  📊 ${scoreName}: ${value}/10`)
  }
}

async function main() {
  console.log('\n' + '█'.repeat(60))
  console.log('██  LANGFUSE EVALUATION RUNNER')
  console.log('██  Running Mazur Framework evaluations')
  console.log('█'.repeat(60) + '\n')
  
  console.log('📡 Langfuse:', process.env.LANGFUSE_BASE_URL || 'http://localhost:3001')
  console.log('')
  
  // Fetch recent traces
  console.log('🔍 Fetching recent storyteller traces...')
  let traces: TraceData[] = []
  
  try {
    traces = await fetchRecentTraces()
  } catch (error: any) {
    console.error('❌ Failed to fetch traces:', error.message)
    console.log('\n💡 Make sure Langfuse is running and has traces.')
    console.log('   You may need to run some storyteller requests first.')
    process.exit(1)
  }
  
  if (traces.length === 0) {
    console.log('⚠️  No storyteller traces found.')
    console.log('   Run some storyteller requests first to generate traces.')
    process.exit(0)
  }
  
  console.log(`✅ Found ${traces.length} traces to evaluate\n`)
  
  // Run evaluations
  let evaluated = 0
  let failed = 0
  
  for (const trace of traces.slice(0, 5)) { // Limit to 5 for demo
    console.log(`\n─── Evaluating: ${trace.name} (${trace.id.slice(0, 8)}...) ───`)
    
    for (const [key, evaluator] of Object.entries(EVALUATORS)) {
      try {
        console.log(`  🧪 Running ${evaluator.name}...`)
        const { scores, reasoning } = await runEvaluation(evaluator, trace)
        await recordScores(trace.id, evaluator.name, scores, reasoning)
        evaluated++
      } catch (error: any) {
        console.error(`  ❌ ${evaluator.name} failed:`, error.message)
        failed++
      }
    }
  }
  
  // Flush scores to Langfuse
  console.log('\n📤 Flushing scores to Langfuse...')
  await langfuse.flush()
  
  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 EVALUATION COMPLETE')
  console.log('='.repeat(60))
  console.log(`✅ Evaluations run: ${evaluated}`)
  console.log(`❌ Evaluations failed: ${failed}`)
  console.log('')
  console.log('🔗 View results:')
  console.log(`   ${process.env.LANGFUSE_BASE_URL || 'http://localhost:3001'}/project/cmkx34dyr0006nt07d2re8zcp/scores`)
  console.log(`   ${process.env.LANGFUSE_BASE_URL || 'http://localhost:3001'}/project/cmkx34dyr0006nt07d2re8zcp/traces`)
  console.log('='.repeat(60) + '\n')
}

main().catch(console.error)
