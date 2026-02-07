import { ExecutiveAgent, ExecutiveConfig, CoPilotInteraction } from '../../../agent-core/executive'
import { createPlannerTool, PlanPersistence } from '../../../agent-core/planner'
import { getPlotPhaseTool, validateConsistencyTool } from '../tools/v2/storytelling-adapter'
import { researchTool, factCheckTool } from '../tools/v2/research-adapter'

// ==========================================
// STORYTELLER PLANNER
// ==========================================
// Extends the core ExecutiveAgent with plot-specific rules.
// Uses Hero's Journey templates for narrative structure.

export interface StorytellerPlannerConfig {
    persistence: PlanPersistence
    modelName?: string
}

export class StorytellerPlanner {

    private agent!: ExecutiveAgent
    private planner: any

    private constructor(config: StorytellerPlannerConfig) {
        this.planner = createPlannerTool(config.persistence)
    }

    static async create(config: StorytellerPlannerConfig): Promise<StorytellerPlanner> {
        const instance = new StorytellerPlanner(config)
        const tools = [
            getPlotPhaseTool,
            validateConsistencyTool,
            researchTool,
            factCheckTool
        ]

        const executiveConfig: ExecutiveConfig = {
            modelName: config.modelName || 'anthropic/claude-3-haiku-20240307',
            planner: instance.planner,
            tools: tools,
            systemPromptKey: 'storyteller-planner-system'
        }

        instance.agent = await ExecutiveAgent.create(executiveConfig)
        return instance
    }

    async planChapter(chapterNumber: number, synopsis: string): Promise<CoPilotInteraction> {
        const context = `Planning Chapter ${chapterNumber}. Synopsis: ${synopsis}`
        return this.agent.runLoop(`Write Chapter ${chapterNumber}`, context)
    }

    async getPlanner(): Promise<any> {
        return this.planner
    }
}
