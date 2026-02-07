
import { Plan } from '../schemas'

// ==========================================
// PLAN TEMPLATES
// ==========================================
// Reusable templates for common planning scenarios.
// Each template provides a starting structure that can be customized.

export interface PlanTemplate {
    id: string
    name: string
    description: string
    domain: 'story' | 'game' | 'e2e' | 'general'
    createPlan(goal: string, context?: Record<string, unknown>): Omit<Plan, 'id' | 'createdAt' | 'updatedAt' | 'version'>
}

// ==========================================
// STORYTELLER TEMPLATES
// ==========================================
export const ChapterPlanTemplate: PlanTemplate = {
    id: 'story-chapter',
    name: 'Chapter Writing Plan',
    description: 'Template for planning a story chapter with outline, draft, and revision phases.',
    domain: 'story',
    createPlan(goal: string, context?: Record<string, unknown>) {
        const chapterNum = context?.chapterNumber || 1
        return {
            goal: goal,
            context: `Chapter ${chapterNum} writing plan`,
            items: [
                { id: '1', title: 'Gather character context', status: 'pending' },
                { id: '2', title: 'Outline key plot beats', status: 'pending' },
                { id: '3', title: 'Write initial draft', status: 'pending', dependencies: ['1', '2'] },
                { id: '4', title: 'Apply consistency check', status: 'pending', dependencies: ['3'] },
                { id: '5', title: 'Revise for style and tone', status: 'pending', dependencies: ['4'] },
                { id: '6', title: 'Final review', status: 'pending', dependencies: ['5'] }
            ]
        }
    }
}

export const CharacterArcTemplate: PlanTemplate = {
    id: 'story-character-arc',
    name: 'Character Arc Development',
    description: 'Template for developing a character arc across multiple chapters.',
    domain: 'story',
    createPlan(goal: string, context?: Record<string, unknown>) {
        const characterName = context?.characterName || 'Protagonist'
        return {
            goal: goal,
            context: `Character arc for ${characterName}`,
            items: [
                { id: '1', title: 'Define starting state', status: 'pending' },
                { id: '2', title: 'Identify core wound/flaw', status: 'pending' },
                { id: '3', title: 'Plan inciting incident', status: 'pending', dependencies: ['1', '2'] },
                { id: '4', title: 'Map transformation beats', status: 'pending', dependencies: ['3'] },
                { id: '5', title: 'Design resolution', status: 'pending', dependencies: ['4'] }
            ]
        }
    }
}

// ==========================================
// GAME LOOP TEMPLATES
// ==========================================
export const EntityCreationTemplate: PlanTemplate = {
    id: 'game-entity',
    name: 'Entity Creation Plan',
    description: 'Template for creating a new game entity with components and behaviors.',
    domain: 'game',
    createPlan(goal: string, context?: Record<string, unknown>) {
        const entityType = context?.entityType || 'generic'
        return {
            goal: goal,
            context: `Creating ${entityType} entity`,
            items: [
                { id: '1', title: 'Define entity requirements', status: 'pending' },
                { id: '2', title: 'Select required components', status: 'pending', dependencies: ['1'] },
                { id: '3', title: 'Configure component properties', status: 'pending', dependencies: ['2'] },
                { id: '4', title: 'Validate ECS integrity', status: 'pending', dependencies: ['3'] },
                { id: '5', title: 'Add to entity registry', status: 'pending', dependencies: ['4'] }
            ]
        }
    }
}

export const SystemImplementationTemplate: PlanTemplate = {
    id: 'game-system',
    name: 'System Implementation Plan',
    description: 'Template for implementing a new ECS system.',
    domain: 'game',
    createPlan(goal: string, context?: Record<string, unknown>) {
        const systemName = context?.systemName || 'CustomSystem'
        return {
            goal: goal,
            context: `Implementing ${systemName}`,
            items: [
                { id: '1', title: 'Define system requirements', status: 'pending' },
                { id: '2', title: 'Identify required components', status: 'pending', dependencies: ['1'] },
                { id: '3', title: 'Implement update loop', status: 'pending', dependencies: ['2'] },
                { id: '4', title: 'Add event handlers', status: 'pending', dependencies: ['3'] },
                { id: '5', title: 'Write unit tests', status: 'pending', dependencies: ['3'] },
                { id: '6', title: 'Integrate with game loop', status: 'pending', dependencies: ['4', '5'] }
            ]
        }
    }
}

// ==========================================
// E2E TESTING TEMPLATES
// ==========================================
export const E2ETestPlanTemplate: PlanTemplate = {
    id: 'e2e-test',
    name: 'E2E Test Plan',
    description: 'Template for creating a comprehensive E2E test.',
    domain: 'e2e',
    createPlan(goal: string, context?: Record<string, unknown>) {
        const feature = context?.feature || 'feature'
        return {
            goal: goal,
            context: `E2E test for ${feature}`,
            items: [
                { id: '1', title: 'Identify test scenarios', status: 'pending' },
                { id: '2', title: 'Define happy path', status: 'pending', dependencies: ['1'] },
                { id: '3', title: 'Define error cases', status: 'pending', dependencies: ['1'] },
                { id: '4', title: 'Write Playwright script', status: 'pending', dependencies: ['2', '3'] },
                { id: '5', title: 'Add assertions', status: 'pending', dependencies: ['4'] },
                { id: '6', title: 'Run and verify', status: 'pending', dependencies: ['5'] }
            ]
        }
    }
}

// ==========================================
// TEMPLATE REGISTRY
// ==========================================
export const PLAN_TEMPLATES: Record<string, PlanTemplate> = {
    'story-chapter': ChapterPlanTemplate,
    'story-character-arc': CharacterArcTemplate,
    'game-entity': EntityCreationTemplate,
    'game-system': SystemImplementationTemplate,
    'e2e-test': E2ETestPlanTemplate
}

export function getTemplatesByDomain(domain: PlanTemplate['domain']): PlanTemplate[] {
    return Object.values(PLAN_TEMPLATES).filter(t => t.domain === domain)
}

export function createPlanFromTemplate(templateId: string, goal: string, context?: Record<string, unknown>): Omit<Plan, 'id' | 'createdAt' | 'updatedAt' | 'version'> {
    const template = PLAN_TEMPLATES[templateId]
    if (!template) throw new Error(`Unknown template: ${templateId}`)
    return template.createPlan(goal, context)
}
