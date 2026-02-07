
import { ExecutiveAgent, ExecutiveConfig } from '../../src/agent-core/executive'
import { PlannerTool, PlanPersistence, PlannerTool as CorePlannerTool } from '../../src/agent-core/planner'
import { ListTestsTool, ReadTestTool, SaveTestTool } from './tools'
import { Plan } from '../../src/agent-core/schemas'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

// Note: Using a simple file-based persistence for the plan
// In a real app this might be a DB
class FilePlanPersistence implements PlanPersistence {
    private filePath: string

    constructor(filePath: string) {
        this.filePath = filePath
    }

    async loadPlan(): Promise<Plan | null> {
        try {
            const data = await fs.readFile(this.filePath, 'utf-8')
            return JSON.parse(data)
        } catch {
            return null
        }
    }

    async savePlan(plan: Plan): Promise<void> {
        await fs.writeFile(this.filePath, JSON.stringify(plan, null, 2))
    }
}

const TODO_FILE = path.join(process.cwd(), 'e2e', 'agent', 'current_plan.json')

export async function createScriptWriterAgent() {
    // 1. Setup Persistence
    const persistence = new FilePlanPersistence(TODO_FILE)

    // 2. Setup Planner
    // FIX: Using CorePlannerTool type but instantiated with persistence
    const planner = new CorePlannerTool(persistence)

    // 3. Setup Tools
    const tools = [
        new ListTestsTool(),
        new ReadTestTool(),
        new SaveTestTool()
    ]

    // 4. Config
    const config: ExecutiveConfig = {
        modelName: 'claude-3-haiku-20240307', // Fast & Cheap for Logic
        planner: planner,
        tools: tools
    }

    return new ExecutiveAgent(config)
}

// Runnable Entrypoint for "Agentic Mode"
if (require.main === module) {
    (async () => {
        const agent = await createScriptWriterAgent()
        console.log("🤖 E2E Script Writer Agent Initialized.")

        // Interactive Loop Simulation (Mock)
        // In reality this would be connected to a CLI or UI
        const interaction = await agent.runLoop(
            "Create a login test",
            "User wants to test the login flow. Happy path + invalid credentials."
        )

        if (interaction.thought) {
            console.log("\n🧠 AGENT THOUGHT:")
            console.log("─".repeat(50))
            console.log(interaction.thought)
            console.log("─".repeat(50) + "\n")
        }

        console.log("👉 Agent Decision:", interaction)
    })()
}
