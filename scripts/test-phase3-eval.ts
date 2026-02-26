
import { EvaluationRunner, EvaluationItem } from '../src/evaluation/engine/runner'
import { RoutingJudge } from '../src/evaluation/judges/routing-judge'

async function main() {
    console.log('Starting Phase 3 Evaluation Engine verification...')

    // 1. Setup Runner
    const judges = [new RoutingJudge()]
    const runner = new EvaluationRunner(judges)

    // 2. Define Mock Dataset
    const dataset: EvaluationItem[] = [
        {
            id: 'test-1',
            input: { message: 'Write a new chapter' },
            expectedOutput: { toolName: 'write_chapter' },
            metadata: { intent: 'writing' }
        },
        {
            id: 'test-2',
            input: { message: 'Research Napoleon' },
            expectedOutput: { expectedAgents: ['ResearchTool'] },
            metadata: { intent: 'research' }
        }
    ]

    // 3. Define Mock Subject (The Agent)
    const mockSubject = async (input: any) => {
        // Simulate agent behavior
        if (input.message.includes('chapter')) {
            return {
                type: 'tool-call',
                toolName: 'write_chapter',
                payload: { chapterIndex: 1 }
            }
        }
        if (input.message.includes('Napoleon')) {
            return {
                type: 'tool-call',
                toolName: 'ResearchTool', // Matches expectedAgent check logic
                payload: { query: 'Napoleon' }
            }
        }
        return { type: 'message', content: 'I assume nothing.' }
    }

    // 4. Run Evaluation
    const results = await runner.run('verification-suite', dataset, mockSubject)

    // 5. Assertions
    console.log('\n--- Results ---')
    let allPassed = true
    for (const res of results) {
        console.log(`[${res.itemId}] Passed: ${res.passed}`)
        console.log(' Scores:', res.scores)
        if (!res.passed) {
            allPassed = false
        }
    }

    if (allPassed) {
        console.log('\n✅ Verification Successful: Evaluation Engine operational.')
    } else {
        console.error('\n❌ Verification Failed: Some tests failed.')
        process.exit(1)
    }
}

main().catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
})
