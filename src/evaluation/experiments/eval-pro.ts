/**
 * Benchmark 2.0 Pro Experiment
 * 
 * Implements the "Critique & Revise" loop (EQ-Bench science).
 * Compares standard generation vs. iterative self-correction.
 */


import OpenAI from 'openai'
import { runABTest } from './storyteller-experiments'
import * as fs from 'fs'
import * as path from 'path'
import { MultiVariantReport, VariantReport } from '../types'
import { saveABTestReport } from '../report-generator'

// ... (existing imports)

// Helper to map ExperimentRun to VariantReport
function mapToVariantReport(run: any): VariantReport {
    return {
        name: run.name,
        config: run.config,
        overallMetrics: {
            magicScore: run.aggregatedScores['magic-score'] || 0,
            consistency: run.aggregatedScores['consistency'] || 0,
            orchestration: run.aggregatedScores['orchestration'] || 0,
            latencyMs: run.duration / run.results.length,
            costUsd: 0
        },
        scenarioMetrics: {}, // Populate if needed
        exampleLogs: run.results.map((r: any) => ({
            id: r.exampleId,
            scenario: 'general',
            input: JSON.stringify(r.input),
            output: typeof r.output === 'string' ? r.output : JSON.stringify(r.output),
            score: r.scores['magic-score'] || 0,
            reasoning: r.reasoning
        }))
    }
}

export async function runProBenchmark() {
    console.log('🚀 Running Benchmark 2.0: Pro Plan (Critique & Revise)')

    const testResult = await runABTest(
        'Critique & Revise vs Standard',
        {
            name: 'Standard',
            generate: generateStandard
        },
        {
            name: 'Pro (Critique & Revise)',
            generate: generateWithCritique
        },
        {
            evaluatorSet: 'pro',
            sampleSize: 3,
            parallelism: 1
        }
    )

    // Save unified A/B test report (HTML)
    saveABTestReport(testResult)

    // SAVE DASHBOARD COMPATIBLE JSON (latest.json)
    const dashboardReport: MultiVariantReport = {
        id: testResult.variantA.id,
        timestamp: new Date().toISOString(),
        scenarios: ['General'],
        variants: [
            mapToVariantReport(testResult.variantA),
            mapToVariantReport(testResult.variantB)
        ]
    }

    const resultsDir = path.resolve(process.cwd(), 'src/evaluation/results')
    if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true })
    fs.writeFileSync(path.join(resultsDir, 'latest.json'), JSON.stringify(dashboardReport, null, 2))
    console.log('   💾 Dashboard data saved to src/evaluation/results/latest.json')
}

// CRITIQUE & REVISE LOGIC
// ============================================

async function generateWithCritique(input: Record<string, unknown>): Promise<unknown> {
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    })

    const message = (input.message as string || '').toLowerCase()

    // Simplified intent detection for meta-questions
    if (message.includes('phase') || message.includes('who are you') || message.includes('help')) {
        return {
            response: `We are currently in the ${input.phase || 'unknown'} phase. I am your Storyteller assistant, ready to help you build your world.`,
            metadata: { isMeta: true }
        }
    }

    // Phase 1: Initial Draft
    const firstPass = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: 'You are a master storyteller. Avoid generic metaphors. Focus on sensory details and internal contradictions. Use a distinct, sharp voice.' },
            { role: 'user', content: `PROMPT: ${JSON.stringify(input)}\n\nWrite a scene that avoids all common AI clichés like "relentless beast," "shadows whispered," or "dance of whispers."` }
        ],
        temperature: 0.7,
    })
    const draft = firstPass.choices[0].message.content || ''

    // Phase 2: Critique (EQ-Bench inspired)
    const critiqueResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: 'You are a ruthless literary editor. Identify "AI-slop", generic phrases, and weak character voice in the following text. Be specific.' },
            { role: 'user', content: draft }
        ],
        temperature: 0,
    })
    const critique = critiqueResponse.choices[0].message.content || ''

    // Phase 3: Revision
    const finalResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: 'Rewrite the following text based on the critique. Focus on "George R.R. Martin" style depth, specific subtext, and removing all generic AI tropes.' },
            { role: 'user', content: `DRAFT:\n${draft}\n\nCRITIQUE:\n${critique}\n\nREWRITE:` }
        ],
        temperature: 0.7,
    })

    return {
        response: finalResponse.choices[0].message.content,
        metadata: {
            hadCritique: true,
            critique: critique
        }
    }
}

async function generateStandard(input: Record<string, unknown>): Promise<unknown> {
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    })

    const message = (input.message as string || '').toLowerCase()
    if (message.includes('phase') || message.includes('who are you') || message.includes('help')) {
        return {
            response: `We are currently in the ${input.phase || 'unknown'} phase.`,
            metadata: { isMeta: true }
        }
    }

    const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: 'You are a master storyteller.' },
            { role: 'user', content: JSON.stringify(input) }
        ],
        temperature: 0.7,
    })

    return {
        response: response.choices[0].message.content,
        metadata: {
            hadCritique: false
        }
    }
}

// ============================================
// RUN EXPERIMENT
// ============================================



if (require.main === module) {
    runProBenchmark().catch(console.error)
}
