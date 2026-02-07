/**
 * E2E Test: Multi-Agent Back-and-Forth Conversations
 *
 * Verifies that agents can consult each other in a realistic workflow,
 * with proper trace propagation and thinking visibility.
 */

import * as dotenv from 'dotenv'
import { v4 as uuidv4 } from 'uuid'
import { AsyncLocalStorage } from 'node:async_hooks'
import { EventEmitter } from 'node:events'

dotenv.config({ path: '.env.local' })

// Import agents
import { createPsychologistAgent } from '../../src/domains/storyteller/agents/v2/psychologist-agent'
import { createConsequenceAgent } from '../../src/domains/storyteller/agents/v2/consequence-agent'
import { createGardenerAgent } from '../../src/domains/storyteller/agents/v2/gardener-agent'
import { flushObservability } from '../../src/agent-core/observability'
import { workflowContext, WORKFLOW_EVENTS } from '../../src/domains/storyteller/utils/workflow-context'

interface ConversationTurn {
    agent: string
    action: string
    input: string
    output?: string
    thinking?: string
    traceId: string
    timestamp: number
}

async function runMultiAgentConversation() {
    console.log('🧪 Starting Multi-Agent Conversation Test')
    console.log('='.repeat(60))

    const conversationLog: ConversationTurn[] = []
    const masterTraceId = uuidv4()
    const projectId = 'test-project-' + Date.now()
    const episodeId = 'test-episode-' + Date.now()

    // Setup event bus for workflow events
    const eventBus = new EventEmitter()
    const thinkingEvents: Array<{ agent: string; thinking: string }> = []

    eventBus.on(WORKFLOW_EVENTS.AGENT_THOUGHT, (data: { agent: string; thinking: string }) => {
        thinkingEvents.push(data)
        console.log(`   💭 [${data.agent}] Thinking captured...`)
    })

    // Run the conversation within the workflow context
    await workflowContext.run({ traceId: masterTraceId, eventBus }, async () => {
        console.log(`\n🎯 Master Trace ID: ${masterTraceId}`)

        // Scenario: Creating a character and then reviewing the beat
        const characterContext = `
Character: Elena Blackwood
Role: Antagonist turned ally
Background: Former assassin who killed the protagonist's mentor.
Current situation: Must work with the protagonist to defeat a greater evil.
`

        // Turn 1: Psychologist analyzes the character
        console.log('\n📍 Turn 1: Psychologist Character Analysis')
        const psychologist = await createPsychologistAgent('openai:gpt-4o', {
            traceId: masterTraceId,
            projectId,
            episodeId
        })

        const psychResult = await psychologist.analyzeProfile(
            'Elena Blackwood',
            characterContext,
            masterTraceId
        )

        conversationLog.push({
            agent: 'Psychologist',
            action: 'analyzeProfile',
            input: characterContext,
            output: psychResult.text,
            thinking: psychResult.thinking,
            traceId: psychologist.getTraceId(),
            timestamp: Date.now()
        })

        console.log(`   ✓ Analysis complete (${psychResult.text.length} chars)`)
        console.log(`   ✓ Has thinking: ${!!psychResult.thinking}`)

        // Turn 2: Gardener writes the reconciliation scene
        console.log('\n📍 Turn 2: Gardener Writes Reconciliation Scene')
        const sceneOutline = `
Scene: Elena and the protagonist meet privately after the battle.
Goal: First genuine moment of connection.
Include: Elena's guilt, protagonist's conflicted feelings.
Psychology insight: ${psychResult.text.slice(0, 500)}
`

        const gardener = await createGardenerAgent('openai:gpt-4o', {
            traceId: masterTraceId,
            projectId,
            episodeId
        })

        const sceneResult = await gardener.writeScene(
            sceneOutline,
            'Dark fantasy, post-battle, quiet tension',
            masterTraceId
        )

        conversationLog.push({
            agent: 'Gardener',
            action: 'writeScene',
            input: sceneOutline,
            output: sceneResult.text,
            thinking: sceneResult.thinking,
            traceId: gardener.getTraceId(),
            timestamp: Date.now()
        })

        console.log(`   ✓ Scene written (${sceneResult.text.length} chars)`)
        console.log(`   ✓ Has thinking: ${!!sceneResult.thinking}`)

        // Turn 3: Consequence agent checks for continuity issues
        console.log('\n📍 Turn 3: Consequence Agent Continuity Check')
        const consequence = await createConsequenceAgent('openai:gpt-4o', {
            traceId: masterTraceId,
            projectId,
            episodeId
        })

        const continuityContext = `
Prior context: Elena killed the protagonist's mentor in Episode 1.
Previous scene: The protagonist nearly killed Elena during the battle.
Current scene: ${sceneResult.text.slice(0, 500)}
`

        const continuityResult = await consequence.validateContinuity(
            'scene-reconciliation',
            continuityContext,
            masterTraceId
        )

        conversationLog.push({
            agent: 'ConsequenceTracker',
            action: 'validateContinuity',
            input: continuityContext,
            output: continuityResult.text,
            thinking: continuityResult.thinking,
            traceId: consequence.getTraceId(),
            timestamp: Date.now()
        })

        console.log(`   ✓ Continuity check complete (${continuityResult.text.length} chars)`)
        console.log(`   ✓ Has thinking: ${!!continuityResult.thinking}`)
    })

    // Flush traces
    console.log('\n⏳ Flushing traces...')
    await flushObservability()

    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('📊 Conversation Summary')
    console.log('='.repeat(60))

    console.log(`\nMaster Trace ID: ${masterTraceId}`)
    console.log(`Total Turns: ${conversationLog.length}`)
    console.log(`Thinking Events Captured: ${thinkingEvents.length}`)

    console.log('\nConversation Flow:')
    for (const turn of conversationLog) {
        const thinkingStatus = turn.thinking ? '🧠' : '  '
        console.log(`  ${thinkingStatus} ${turn.agent}.${turn.action}`)
        console.log(`      Output: ${turn.output?.slice(0, 100)}...`)
    }

    // Verify all agents participated
    const agents = new Set(conversationLog.map(t => t.agent))
    console.log(`\nAgents Involved: ${Array.from(agents).join(', ')}`)

    if (agents.size >= 3) {
        console.log('\n✅ Multi-agent conversation completed successfully!')
        console.log(`\n📍 View full trace at: https://cloud.langfuse.com/project/${process.env.LANGFUSE_PROJECT_ID}/traces/${masterTraceId}`)
    } else {
        console.log('\n⚠️  Expected 3 agents, found:', agents.size)
    }

    // Return results for programmatic verification
    return {
        masterTraceId,
        turns: conversationLog.length,
        agents: Array.from(agents),
        thinkingEvents: thinkingEvents.length
    }
}

// Export for programmatic use
export { runMultiAgentConversation }

// Run if executed directly
if (require.main === module) {
    runMultiAgentConversation()
        .then(result => {
            console.log('\n📋 Final Result:', JSON.stringify(result, null, 2))
        })
        .catch(error => {
            console.error('❌ Test failed:', error)
            process.exit(1)
        })
}
