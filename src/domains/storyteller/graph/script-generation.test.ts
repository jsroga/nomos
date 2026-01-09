import { writersRoomGraph } from './writers-room'
import { HumanMessage } from '@langchain/core/messages'
import { checkLangSmithConfig } from '@/lib/langsmith'

/**
 * E2E Test for Script Generation with LangSmith Evaluation
 * 
 * Run with: npx tsx src/domains/storyteller/graph/script-generation.test.ts
 * 
 * View results in LangSmith: https://smith.langchain.com
 * Filter by: tags = ['test', 'script-generation']
 */

// Evaluation criteria
interface EvaluationResult {
    testName: string
    passed: boolean
    metrics: {
        writerNodeReached: boolean
        scriptProduced: boolean
        scriptLength: number
        updateScriptActionFound: boolean
        executionTimeMs: number
        nodeSequence: string[]
    }
    errors: string[]
}

async function testScriptGeneration(): Promise<EvaluationResult> {
    const startTime = Date.now()
    const errors: string[] = []
    const nodeSequence: string[] = []

    let writerNodeReached = false
    let scriptProduced = false
    let scriptLength = 0
    let updateScriptActionFound = false

    // Initial state: Episode with beats, ready for script generation
    const initialState = {
        projectId: 'test-project',
        episodeId: 'test-episode',
        currentPhase: 'writing', // CRITICAL: Must be 'writing' for Writer to activate
        phaseIterations: 0,
        maxIterationsPerPhase: 15,
        seriesBible: {
            genre: 'Sci-Fi Noir',
            tone: 'Dark, atmospheric',
            premise: 'A debt-collector in a dystopian credit-score society questions the system.',
        },
        characters: [
            {
                characterId: 'lena',
                name: 'Lena Kovács',
                currentGoals: ['Survive daily life under the Ledger system'],
                fears: ['Becoming like the people she collects from'],
                selfDelusion: 'I am just doing my job',
                actualMotivation: 'Guilt over her brothers fate',
                knowledgeState: [],
                // Required fields from CharacterState
                stressLevel: 65,
                transformationProgress: 15,
                metrics: {
                    valence: -20,
                    arousal: 60,
                    autonomy: 40,
                    competence: 55,
                    relatedness: 30,
                    cognitiveClarity: 50,
                    perceivedStakes: 70,
                    socialSafety: 35,
                    moralAlignment: 45,
                    transformation: 15,
                },
                metricsHistory: [],
            },
        ],
        beatBoard: [
            {
                id: 'beat-1',
                episodeId: 'test-episode',
                sequence: 1,
                logline: 'Lena wakes in her wet-zone apartment, ignoring Ledger reassessment warnings.',
                content: 'Opening scene establishing Lenas daily grind under the credit system.',
                beatType: 'setup',
                charactersInvolved: ['lena'],
                emotionalShifts: { lena: { from: 'weary', to: 'anxious' } },
                visualHook: 'Cracked photo of Lena and her brother',
                causalDependencies: [],
                setupsPayoffs: {},
                status: 'approved',
            },
        ],
        messages: [
            new HumanMessage({
                content: 'Write the full dialogue script for this episode. Include scene headers and character actions.',
                name: 'User',
            }),
        ],
        // Required state fields
        unresolvedSetups: [],
        rejectedBeats: [],
        awaitingUserInput: false,
        shouldTerminate: false,
        beatChallengeCount: 0,
        minConfidenceThreshold: 0.7,
        scriptRevisionCount: 0,
        scriptFeedback: [],
        plan: [],
        deepMemory: {},
        plannerThinking: '',
    }

    try {
        const stream = await writersRoomGraph.stream(initialState as any, {
            recursionLimit: 10,
            // LangSmith tracing config
            runName: 'Script Generation E2E Test',
            tags: ['test', 'script-generation', 'e2e'],
            metadata: {
                testType: 'script-generation',
                phase: 'writing',
                beatsCount: initialState.beatBoard.length,
            },
        })

        for await (const event of stream) {
            for (const [nodeName, nodeOutput] of Object.entries(event)) {
                nodeSequence.push(nodeName)

                if (nodeName === 'writer') {
                    writerNodeReached = true
                }

                if (nodeOutput && typeof nodeOutput === 'object') {
                    const output = nodeOutput as any

                    // Check messages for UPDATE_SCRIPT action
                    if (output.messages) {
                        for (const msg of output.messages) {
                            const actions = (msg as any).actions || []
                            for (const action of actions) {
                                if (action.type === 'UPDATE_SCRIPT') {
                                    updateScriptActionFound = true
                                    if (action.payload?.content) {
                                        scriptLength = action.payload.content.length
                                    }
                                }
                            }
                        }
                    }

                    // Check for script in state
                    if (output.script && output.script.length > 0) {
                        scriptProduced = true
                        scriptLength = Math.max(scriptLength, output.script.length)
                    }
                }
            }
        }
    } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error))
    }

    const executionTimeMs = Date.now() - startTime

    return {
        testName: 'Script Generation E2E',
        passed: writerNodeReached && (scriptProduced || updateScriptActionFound),
        metrics: {
            writerNodeReached,
            scriptProduced,
            scriptLength,
            updateScriptActionFound,
            executionTimeMs,
            nodeSequence,
        },
        errors,
    }
}

// Run evaluations
async function runEvaluations() {
    console.log('========================================')
    console.log('🧪 Script Generation E2E Tests')
    console.log('========================================\n')

    // Check LangSmith config
    const langsmithConfig = checkLangSmithConfig()
    if (langsmithConfig.enabled) {
        console.log('✅ LangSmith tracing ENABLED')
        console.log(`   Project: ${process.env.LANGCHAIN_PROJECT || 'default'}`)
        console.log('   View traces at: https://smith.langchain.com\n')
    } else {
        console.log('⚠️ LangSmith tracing DISABLED')
        console.log('   Issues:', langsmithConfig.issues.join(', '))
        console.log('   Set LANGCHAIN_TRACING_V2=true and LANGCHAIN_API_KEY to enable\n')
    }

    // Run the test
    console.log('🚀 Running: Script Generation Test...')
    const result = await testScriptGeneration()

    // Print results
    console.log('\n========================================')
    console.log('📊 EVALUATION RESULTS')
    console.log('========================================')
    console.log(`Test: ${result.testName}`)
    console.log(`Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`)
    console.log(`\nMetrics:`)
    console.log(`  - Writer node reached: ${result.metrics.writerNodeReached ? '✅' : '❌'}`)
    console.log(`  - Script produced: ${result.metrics.scriptProduced ? '✅' : '❌'}`)
    console.log(`  - UPDATE_SCRIPT action: ${result.metrics.updateScriptActionFound ? '✅' : '❌'}`)
    console.log(`  - Script length: ${result.metrics.scriptLength} chars`)
    console.log(`  - Execution time: ${result.metrics.executionTimeMs}ms`)
    console.log(`  - Node sequence: ${result.metrics.nodeSequence.join(' → ')}`)

    if (result.errors.length > 0) {
        console.log(`\n❌ Errors:`)
        result.errors.forEach(e => console.log(`  - ${e}`))
    }

    // Exit with appropriate code
    if (!result.passed) {
        console.log('\n💡 Debugging tips:')
        if (!result.metrics.writerNodeReached) {
            console.log('  - Check supervisor routing: Writer should be called in writing phase')
            console.log('  - Verify currentPhase is "writing" not "premise"')
        }
        if (result.metrics.nodeSequence.includes('planner')) {
            console.log('  - Supervisor routed to Planner instead of Writer directly')
            console.log('  - Check PHASE_ALLOWED_AGENTS and supervisor prompt')
        }
        process.exit(1)
    }

    console.log('\n🎉 All tests passed!')
}

runEvaluations().catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
})
