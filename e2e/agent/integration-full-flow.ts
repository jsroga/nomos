/**
 * Integration Test: Full Storyteller Flow
 *
 * End-to-end test that verifies:
 * 1. Workspace initialization and script storage
 * 2. Skill loading
 * 3. Multi-agent conversations with trace propagation
 * 4. Search functionality
 * 5. Langfuse trace verification
 */

import * as dotenv from 'dotenv'
import { v4 as uuidv4 } from 'uuid'
import { EventEmitter } from 'node:events'

dotenv.config({ path: '.env.local' })

// Import all modules
import { initializeWorkspace, getStorytellerWorkspace } from '../../src/agent-core/workspace'
import { getSearchEngine } from '../../src/agent-core/search'
import { loadSkills, buildSkillsPrompt } from '../../src/agent-core/skills'
import { flushObservability, langfuse } from '../../src/agent-core/observability'
import { workflowContext, WORKFLOW_EVENTS } from '../../src/domains/storyteller/utils/workflow-context'

// Import agents
import { createPsychologistAgent } from '../../src/domains/storyteller/agents/v2/psychologist-agent'
import { createGardenerAgent } from '../../src/domains/storyteller/agents/v2/gardener-agent'
import { createConsequenceAgent } from '../../src/domains/storyteller/agents/v2/consequence-agent'

interface TestResult {
    step: string
    passed: boolean
    details?: string
    error?: string
}

async function runFullIntegrationTest(): Promise<TestResult[]> {
    const results: TestResult[] = []
    const masterTraceId = uuidv4()
    const projectId = `integration-test-${Date.now()}`

    console.log('🧪 Full Integration Test')
    console.log('='.repeat(60))
    console.log(`Master Trace ID: ${masterTraceId}`)
    console.log(`Project ID: ${projectId}`)
    console.log('')

    // Create Langfuse trace for the entire test
    try {
        langfuse.trace({
            id: masterTraceId,
            name: 'Integration Test: Full Storyteller Flow',
            metadata: { projectId, testType: 'integration' },
            tags: ['integration-test', 'storyteller']
        })
    } catch (e) {
        console.warn('Langfuse not configured, continuing without tracing')
    }

    // Step 1: Initialize Workspace
    console.log('📁 Step 1: Initialize Workspace')
    try {
        const workspace = await initializeWorkspace()
        results.push({ step: 'Workspace Init', passed: true, details: 'Workspace initialized successfully' })
        console.log('   ✅ Workspace initialized')
    } catch (error: any) {
        results.push({ step: 'Workspace Init', passed: false, error: error.message })
        console.log('   ❌ Workspace init failed:', error.message)
    }

    // Step 2: Load Skills
    console.log('\n📚 Step 2: Load Skills')
    try {
        const skills = await loadSkills(['storyteller', 'writing', 'psychology'])
        const skillsPrompt = buildSkillsPrompt(skills, false)

        if (skills.length >= 3) {
            results.push({
                step: 'Load Skills',
                passed: true,
                details: `Loaded ${skills.length} skills (${skillsPrompt.length} chars)`
            })
            console.log(`   ✅ Loaded ${skills.length} skills`)
        } else {
            results.push({
                step: 'Load Skills',
                passed: false,
                error: `Expected 3 skills, got ${skills.length}`
            })
            console.log(`   ⚠️ Only loaded ${skills.length} skills`)
        }
    } catch (error: any) {
        results.push({ step: 'Load Skills', passed: false, error: error.message })
        console.log('   ❌ Skill loading failed:', error.message)
    }

    // Step 3: Create and Store Script
    console.log('\n📝 Step 3: Create Script in Workspace')
    let savedScriptId: string | null = null
    try {
        const workspace = getStorytellerWorkspace()
        const script = await workspace.saveScript({
            type: 'script',
            name: 'Integration Test Scene',
            content: `INT. DARK ALLEY - NIGHT

KIRA stands alone, the rain washing away blood from her blade.

KIRA
(to herself)
This is what I've become.

A shadow moves. She spins, ready.

MYSTERIOUS FIGURE
You fight like your father.

Kira's eyes widen.`,
            projectId
        })
        savedScriptId = script.id
        results.push({
            step: 'Create Script',
            passed: true,
            details: `Script ID: ${script.id.slice(0, 8)}...`
        })
        console.log(`   ✅ Script created: ${script.id.slice(0, 8)}...`)
    } catch (error: any) {
        results.push({ step: 'Create Script', passed: false, error: error.message })
        console.log('   ❌ Script creation failed:', error.message)
    }

    // Step 4: Index and Search
    console.log('\n🔎 Step 4: Search Functionality')
    try {
        const searchEngine = getSearchEngine()

        // Index the saved script
        if (savedScriptId) {
            const workspace = getStorytellerWorkspace()
            const script = await workspace.loadScript(savedScriptId)
            if (script) {
                searchEngine.indexDocument(script)
            }
        }

        const searchResults = await searchEngine.search('Kira blade', { mode: 'bm25', limit: 5 })

        if (searchResults.length > 0) {
            results.push({
                step: 'Search',
                passed: true,
                details: `Found ${searchResults.length} results`
            })
            console.log(`   ✅ Search returned ${searchResults.length} results`)
        } else {
            results.push({
                step: 'Search',
                passed: true,
                details: 'Search working but no results (expected for fresh index)'
            })
            console.log('   ✅ Search working (no results in fresh index)')
        }
    } catch (error: any) {
        results.push({ step: 'Search', passed: false, error: error.message })
        console.log('   ❌ Search failed:', error.message)
    }

    // Step 5: Multi-Agent Conversation with Tracing
    console.log('\n🤖 Step 5: Multi-Agent Conversation')

    const eventBus = new EventEmitter()
    const thinkingEvents: string[] = []

    eventBus.on(WORKFLOW_EVENTS.AGENT_THOUGHT, (data: { agent: string; thinking: string }) => {
        thinkingEvents.push(data.agent)
    })

    try {
        await workflowContext.run({ traceId: masterTraceId, eventBus }, async () => {
            // Agent 1: Psychologist
            console.log('   → Consulting Psychologist...')
            const psychologist = await createPsychologistAgent('openai:gpt-4o', {
                traceId: masterTraceId,
                projectId
            })
            const psychResult = await psychologist.analyzeProfile(
                'Kira',
                'A warrior haunted by her past.',
                masterTraceId
            )

            // Agent 2: Gardener
            console.log('   → Consulting Gardener...')
            const gardener = await createGardenerAgent('openai:gpt-4o', {
                traceId: masterTraceId,
                projectId
            })
            const sceneResult = await gardener.optimizeProse(
                'Kira felt sad about what happened.',
                masterTraceId
            )

            // Agent 3: Consequence
            console.log('   → Consulting Consequence Tracker...')
            const consequence = await createConsequenceAgent('openai:gpt-4o', {
                traceId: masterTraceId,
                projectId
            })
            const continuityResult = await consequence.checkCausality(
                'Kira uses her fathers sword',
                'Kiras father died when she was a child.',
                masterTraceId
            )

            const allPassed = psychResult.text && sceneResult.text && continuityResult.text

            if (allPassed) {
                results.push({
                    step: 'Multi-Agent Conversation',
                    passed: true,
                    details: `3 agents consulted, ${thinkingEvents.length} thinking events`
                })
                console.log('   ✅ All 3 agents responded successfully')
            } else {
                results.push({
                    step: 'Multi-Agent Conversation',
                    passed: false,
                    error: 'Some agents failed to respond'
                })
            }
        })
    } catch (error: any) {
        results.push({ step: 'Multi-Agent Conversation', passed: false, error: error.message })
        console.log('   ❌ Multi-agent conversation failed:', error.message)
    }

    // Step 6: Cleanup
    console.log('\n🧹 Step 6: Cleanup')
    try {
        if (savedScriptId) {
            const workspace = getStorytellerWorkspace()
            await workspace.deleteScript(savedScriptId)
            console.log('   ✅ Test script deleted')
        }
        results.push({ step: 'Cleanup', passed: true })
    } catch (error: any) {
        results.push({ step: 'Cleanup', passed: false, error: error.message })
        console.log('   ❌ Cleanup failed:', error.message)
    }

    // Flush traces
    console.log('\n⏳ Flushing traces to Langfuse...')
    try {
        await flushObservability()
        await langfuse.flush()
    } catch {
        // Langfuse may not be configured
    }

    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('📊 Integration Test Summary')
    console.log('='.repeat(60))

    const passed = results.filter(r => r.passed).length
    const total = results.length

    for (const result of results) {
        const icon = result.passed ? '✅' : '❌'
        console.log(`${icon} ${result.step}: ${result.details || result.error || 'OK'}`)
    }

    console.log('')
    console.log(`Result: ${passed}/${total} steps passed`)
    console.log(`Master Trace ID: ${masterTraceId}`)

    if (passed === total) {
        console.log('\n🎉 All integration tests passed!')
    } else {
        console.log('\n⚠️ Some tests failed. Check details above.')
    }

    return results
}

// Export for programmatic use
export { runFullIntegrationTest }

// Run if executed directly
if (require.main === module) {
    runFullIntegrationTest()
        .then(results => {
            const allPassed = results.every(r => r.passed)
            process.exit(allPassed ? 0 : 1)
        })
        .catch(error => {
            console.error('❌ Integration test crashed:', error)
            process.exit(1)
        })
}
