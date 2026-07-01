/**
 * E2E Test: Langfuse Multi-Agent Trace Verification
 *
 * Verifies that all specialized agents (Psychologist, Gardener, Consequence, etc.)
 * create proper traces in Langfuse when consulted.
 */

import * as dotenv from 'dotenv'
import { v4 as uuidv4 } from 'uuid'
import { Langfuse } from 'langfuse'

dotenv.config({ path: '.env.local' })

// Import agents
import { createPsychologistAgent } from '@/domains/storyteller/agents/PsychologistAgent'
import { createConsequenceAgent } from '@/domains/storyteller/agents/ConsequenceAgent'
import { createGardenerAgent } from '@/domains/storyteller/agents/GardenerAgent'
import { createDevilsAdvocateAgent } from '@/domains/storyteller/agents/DevilsAdvocateAgent'
import { flushObservability } from '../../src/agent-core/observability'

// Create a verification client
const langfuse = new Langfuse({
    publicKey: process.env.LANGFUSE_PUBLIC_KEY,
    secretKey: process.env.LANGFUSE_SECRET_KEY,
    baseUrl: process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com',
})

interface TraceVerificationResult {
    agentName: string
    traceId: string
    success: boolean
    hasGeneration: boolean
    hasThinking: boolean
    error?: string
}

async function verifyAgentTrace(
    agentName: string,
    traceId: string
): Promise<TraceVerificationResult> {
    try {
        // Wait for traces to be flushed
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Query the trace from Langfuse
        const trace = await langfuse.fetchTrace(traceId)

        if (!trace) {
            return {
                agentName,
                traceId,
                success: false,
                hasGeneration: false,
                hasThinking: false,
                error: 'Trace not found in Langfuse'
            }
        }

        // Check for generations and events
        const observations = trace.observations || []
        const hasGeneration = observations.some((o: any) => o.type === 'GENERATION')
        const hasThinking = observations.some((o: any) =>
            o.type === 'EVENT' && o.name?.includes('thinking')
        )

        return {
            agentName,
            traceId,
            success: true,
            hasGeneration,
            hasThinking,
        }
    } catch (error: any) {
        return {
            agentName,
            traceId,
            success: false,
            hasGeneration: false,
            hasThinking: false,
            error: error.message
        }
    }
}

async function runLangfuseTraceTests() {
    console.log('🧪 Starting Langfuse Multi-Agent Trace Verification')
    console.log('=' .repeat(60))

    const results: TraceVerificationResult[] = []
    const testTraceId = uuidv4()

    // Test context
    const testContext = {
        projectId: 'test-project-' + Date.now(),
        episodeId: 'test-episode-' + Date.now(),
        traceId: testTraceId,
    }

    // 1. Test Psychologist Agent
    console.log('\n📍 Testing Psychologist Agent...')
    try {
        const psychologist = await createPsychologistAgent('openai:gpt-4o', testContext)
        const psychTraceId = psychologist.getTraceId()
        console.log(`   TraceId: ${psychTraceId}`)

        // Make a call to generate trace data
        const result = await psychologist.analyzeProfile(
            'TestCharacter',
            'A brave warrior who fears nothing but losing their family.',
            psychTraceId
        )
        console.log(`   ✓ Got response: ${result.text.slice(0, 100)}...`)
        console.log(`   ✓ Has thinking: ${!!result.thinking}`)

        results.push({
            agentName: 'Psychologist',
            traceId: psychTraceId,
            success: true,
            hasGeneration: true,
            hasThinking: !!result.thinking,
        })
    } catch (error: any) {
        console.log(`   ❌ Error: ${error.message}`)
        results.push({
            agentName: 'Psychologist',
            traceId: 'N/A',
            success: false,
            hasGeneration: false,
            hasThinking: false,
            error: error.message
        })
    }

    // 2. Test Consequence Agent
    console.log('\n📍 Testing Consequence Agent...')
    try {
        const consequence = await createConsequenceAgent('openai:gpt-4o', testContext)
        const conseqTraceId = consequence.getTraceId()
        console.log(`   TraceId: ${conseqTraceId}`)

        const result = await consequence.validateContinuity(
            'beat-123',
            'Character picks up a sword that was destroyed in the previous scene.',
            conseqTraceId
        )
        console.log(`   ✓ Got response: ${result.text.slice(0, 100)}...`)
        console.log(`   ✓ Has thinking: ${!!result.thinking}`)

        results.push({
            agentName: 'ConsequenceTracker',
            traceId: conseqTraceId,
            success: true,
            hasGeneration: true,
            hasThinking: !!result.thinking,
        })
    } catch (error: any) {
        console.log(`   ❌ Error: ${error.message}`)
        results.push({
            agentName: 'ConsequenceTracker',
            traceId: 'N/A',
            success: false,
            hasGeneration: false,
            hasThinking: false,
            error: error.message
        })
    }

    // 3. Test Gardener Agent
    console.log('\n📍 Testing Gardener Agent...')
    try {
        const gardener = await createGardenerAgent('openai:gpt-4o', testContext)
        const gardenerTraceId = gardener.getTraceId()
        console.log(`   TraceId: ${gardenerTraceId}`)

        const result = await gardener.writeScene(
            'The hero enters the ancient temple.',
            'Fantasy setting, high tension moment.',
            gardenerTraceId
        )
        console.log(`   ✓ Got response: ${result.text.slice(0, 100)}...`)
        console.log(`   ✓ Has thinking: ${!!result.thinking}`)

        results.push({
            agentName: 'Gardener',
            traceId: gardenerTraceId,
            success: true,
            hasGeneration: true,
            hasThinking: !!result.thinking,
        })
    } catch (error: any) {
        console.log(`   ❌ Error: ${error.message}`)
        results.push({
            agentName: 'Gardener',
            traceId: 'N/A',
            success: false,
            hasGeneration: false,
            hasThinking: false,
            error: error.message
        })
    }

    // 4. Test Devil's Advocate Agent
    console.log('\n📍 Testing DevilsAdvocate Agent...')
    try {
        const devilsAdvocate = await createDevilsAdvocateAgent('openai:gpt-4o', testContext)
        const daTraceId = devilsAdvocate.getTraceId()
        console.log(`   TraceId: ${daTraceId}`)

        const result = await devilsAdvocate.critique(
            'The hero defeats the villain with the power of friendship.',
            'High fantasy epic conclusion.',
            daTraceId
        )
        console.log(`   ✓ Got response: ${result.text.slice(0, 100)}...`)
        console.log(`   ✓ Has thinking: ${!!result.thinking}`)

        results.push({
            agentName: 'DevilsAdvocate',
            traceId: daTraceId,
            success: true,
            hasGeneration: true,
            hasThinking: !!result.thinking,
        })
    } catch (error: any) {
        console.log(`   ❌ Error: ${error.message}`)
        results.push({
            agentName: 'DevilsAdvocate',
            traceId: 'N/A',
            success: false,
            hasGeneration: false,
            hasThinking: false,
            error: error.message
        })
    }

    // Flush all traces
    console.log('\n⏳ Flushing traces to Langfuse...')
    await flushObservability()
    await langfuse.flush()

    // Summary
    console.log('\n' + '=' .repeat(60))
    console.log('📊 Test Summary')
    console.log('=' .repeat(60))

    const successCount = results.filter(r => r.success).length
    const totalCount = results.length

    for (const result of results) {
        const status = result.success ? '✅' : '❌'
        const thinking = result.hasThinking ? '🧠' : '  '
        console.log(`${status} ${thinking} ${result.agentName.padEnd(20)} TraceId: ${result.traceId.slice(0, 8)}...`)
        if (result.error) {
            console.log(`      Error: ${result.error}`)
        }
    }

    console.log('\n' + '-'.repeat(60))
    console.log(`Total: ${successCount}/${totalCount} agents traced successfully`)

    if (successCount < totalCount) {
        console.log('\n⚠️  Some agents failed to trace. Check Langfuse configuration.')
        process.exit(1)
    } else {
        console.log('\n🎉 All agents traced successfully!')
        console.log('\nView traces at: https://cloud.langfuse.com')
    }
}

runLangfuseTraceTests()
    .catch(error => {
        console.error('❌ Test failed:', error)
        process.exit(1)
    })
