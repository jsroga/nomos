
import { EvaluationRunner, EvaluationItem } from '../src/evaluation/engine/runner'
import { RoutingJudge, HaltingJudge, ConsistencyJudge } from '../src/evaluation/judges'
import { StorytellerPlanner } from '../src/domains/storyteller/planner/storyteller-planner'
import { MemoryPersistence } from '../src/agent-core/persistence/memory-store'

async function main() {
    console.log('🚀 Starting Storyteller Evaluation (Mastra + Langfuse)...')

    // 1. Setup Runner & Judges
    const runner = new EvaluationRunner([
        new RoutingJudge(),
        new HaltingJudge(),
        new ConsistencyJudge() // Will use heuristic for now
        // CoherenceJudge omitted until real LLM connected
    ])

    // 2. Setup Agent (System Under Test)
    const persistence = new MemoryPersistence()
    const planner = await StorytellerPlanner.create({ persistence })

    // 3. Define Dataset (Realistic Scenarios)
    const dataset: EvaluationItem[] = [
        {
            id: 'scene-1',
            input: {
                chapter: 1,
                synopsis: 'The hero wakes up in a normal world, but hears a strange noise.'
            },
            expectedOutput: {
                toolName: 'get_plot_phase', // Agents usually check phase first
                shouldHalt: false
            },
            metadata: { complexity: 'low' }
        },
        {
            id: 'consistency-check',
            input: {
                chapter: 2,
                synopsis: 'The hero kills the villain. The villain laughs at him.' // Contradiction?
            },
            expectedOutput: {
                expectedAgents: ['ValidatePlotConsistency', 'Consistency']
            },
            metadata: { complexity: 'medium' }
        }
    ]

    // 4. Define Subject Wrapper
    const subject = async (input: any) => {
        // We wrap the agent call to match runner expectations
        // planner.planChapter returns CoPilotInteraction
        const result = await planner.planChapter(input.chapter, input.synopsis)
        return result // { type, toolName, payload, message }
    }

    // 5. Run
    const results = await runner.run('storyteller-v2-migration', dataset, subject)

    console.log('\n📊 Evaluation Complete')
    console.table(results.map(r => ({
        id: r.itemId,
        passed: r.passed,
        ...r.scores
    })))
}

main().catch(console.error)
