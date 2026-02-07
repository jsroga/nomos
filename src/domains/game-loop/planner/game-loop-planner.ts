
import { ExecutiveAgent, ExecutiveConfig, CoPilotInteraction } from '../../../agent-core/executive'
import { PlannerTool, PlanPersistence } from '../../../agent-core/planner'
import { StructuredTool } from '@langchain/core/tools'
import { z } from 'zod'

// ==========================================
// GAME LOOP PLANNER
// ==========================================
// Extends the core ExecutiveAgent with ECS-specific rules.
// Manages entity creation, component systems, and game state.

const ECS_COMPONENT_TEMPLATES = {
    components: [
        { id: 'transform', name: 'Transform', fields: ['position', 'rotation', 'scale'] },
        { id: 'sprite', name: 'Sprite', fields: ['texture', 'layer', 'opacity'] },
        { id: 'physics', name: 'Physics', fields: ['velocity', 'mass', 'friction'] },
        { id: 'collider', name: 'Collider', fields: ['bounds', 'isTrigger', 'layer'] },
        { id: 'health', name: 'Health', fields: ['current', 'max', 'regeneration'] },
        { id: 'inventory', name: 'Inventory', fields: ['slots', 'capacity', 'items'] },
        { id: 'ai', name: 'AI', fields: ['behaviorTree', 'target', 'state'] }
    ],
    systems: [
        { id: 'movement', name: 'MovementSystem', requires: ['Transform', 'Physics'] },
        { id: 'rendering', name: 'RenderingSystem', requires: ['Transform', 'Sprite'] },
        { id: 'collision', name: 'CollisionSystem', requires: ['Transform', 'Collider'] },
        { id: 'combat', name: 'CombatSystem', requires: ['Health', 'Collider'] },
        { id: 'ai_controller', name: 'AIControllerSystem', requires: ['AI', 'Transform'] }
    ]
}

// Game-specific tool: List required components for an entity type
export class GetEntityComponentsTool extends StructuredTool {
    name = 'get_entity_components'
    description = 'Get recommended ECS components for an entity type.'
    schema = z.object({
        entityType: z.enum(['player', 'enemy', 'npc', 'item', 'environment', 'projectile'])
    })

    async _call(input: { entityType: string }): Promise<string> {
        const componentsByType: Record<string, string[]> = {
            'player': ['Transform', 'Sprite', 'Physics', 'Collider', 'Health', 'Inventory'],
            'enemy': ['Transform', 'Sprite', 'Physics', 'Collider', 'Health', 'AI'],
            'npc': ['Transform', 'Sprite', 'Collider', 'AI', 'Inventory'],
            'item': ['Transform', 'Sprite', 'Collider'],
            'environment': ['Transform', 'Sprite', 'Collider'],
            'projectile': ['Transform', 'Sprite', 'Physics', 'Collider']
        }

        return JSON.stringify({
            entityType: input.entityType,
            components: componentsByType[input.entityType] || ['Transform', 'Sprite'],
            systems: ECS_COMPONENT_TEMPLATES.systems
                .filter(s => s.requires.some(r => componentsByType[input.entityType]?.includes(r)))
                .map(s => s.name)
        })
    }
}

// Game-specific tool: Validate ECS integrity
export class ValidateECSIntegrityTool extends StructuredTool {
    name = 'validate_ecs_integrity'
    description = 'Check if entity components are valid for required systems.'
    schema = z.object({
        entityComponents: z.array(z.string()).describe('List of components attached to entity'),
        targetSystems: z.array(z.string()).describe('Systems the entity should work with')
    })

    async _call(input: { entityComponents: string[], targetSystems: string[] }): Promise<string> {
        const issues: string[] = []

        for (const systemName of input.targetSystems) {
            const system = ECS_COMPONENT_TEMPLATES.systems.find(s => s.name === systemName)
            if (!system) {
                issues.push(`Unknown system: ${systemName}`)
                continue
            }

            const missingComponents = system.requires.filter(r => !input.entityComponents.includes(r))
            if (missingComponents.length > 0) {
                issues.push(`${systemName} requires: ${missingComponents.join(', ')}`)
            }
        }

        return JSON.stringify({
            isValid: issues.length === 0,
            issues: issues,
            suggestion: issues.length > 0 ? 'Add missing components to entity.' : 'Entity is valid for all target systems.'
        })
    }
}

export interface GameLoopPlannerConfig {
    persistence: PlanPersistence
    modelName?: string
}

export class GameLoopPlanner {
    private agent: ExecutiveAgent
    private planner: PlannerTool

    constructor(config: GameLoopPlannerConfig) {
        this.planner = new PlannerTool(config.persistence)

        const tools = [
            new GetEntityComponentsTool(),
            new ValidateECSIntegrityTool()
        ]

        const executiveConfig: ExecutiveConfig = {
            modelName: config.modelName || 'claude-3-haiku-20240307',
            planner: this.planner,
            tools: tools
        }

        this.agent = new ExecutiveAgent(executiveConfig)
    }

    async planEntity(entityType: string, requirements: string): Promise<CoPilotInteraction> {
        const context = `Creating ${entityType} entity. Requirements: ${requirements}`
        return this.agent.runLoop(`Create ${entityType} entity`, context)
    }

    async planSystem(systemName: string, functionality: string): Promise<CoPilotInteraction> {
        const context = `Implementing ${systemName}. Functionality: ${functionality}`
        return this.agent.runLoop(`Implement ${systemName}`, context)
    }

    async getPlanner(): Promise<PlannerTool> {
        return this.planner
    }
}
