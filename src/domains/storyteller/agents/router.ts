/**
 * Router Agent
 *
 * Routes incoming user requests to the appropriate specialist agent.
 * Part of the Router pattern from LangChain multi-agent architecture.
 *
 * Responsibilities:
 * - Classify user requests
 * - Select the best agent for the task
 * - Create initial task with context
 * - Hand off to specialist
 */

import { ChatOpenAI } from '@langchain/openai'
import { AIMessage, SystemMessage } from '@langchain/core/messages'
import { WritersRoomState, Task } from '../graph/state'
import { SpecialistAgent } from '../tools/handoff-tool'
import { z } from 'zod'

/**
 * Request classification schema
 */
const ClassificationSchema = z.object({
  category: z
    .enum([
      'script_writing',
      'premise_design',
      'episode_premise',
      'plot_structure',
      'character_work',
      'review_critique',
      'world_building',
      'planning',
      'question',
    ])
    .describe('Primary category of the request'),
  complexity: z.enum(['simple', 'moderate', 'complex']).describe('Task complexity'),
  requiresPlanning: z.boolean().describe('Whether this needs multi-step planning'),
  suggestedAgent: z
    .enum([
      'writer',
      'plot_architect',
      'character_psychology',
      'premise_architect',
      'episode_premise_architect',
      'devils_advocate',
      'planner',
    ])
    .describe('Best agent for this task'),
  reasoning: z.string().describe('Why this agent was selected'),
})

type Classification = z.infer<typeof ClassificationSchema>

/**
 * Router agent - entry point for all user requests
 */
export async function routerAgent(state: WritersRoomState): Promise<Partial<WritersRoomState>> {
  // Only route if no active agent (initial routing)
  if (state.activeAgent && state.activeAgent !== 'router') {
    return { messages: [] }
  }

  const lastMessage = state.messages[state.messages.length - 1]

  if (!lastMessage || lastMessage.constructor.name !== 'HumanMessage') {
    return { messages: [] }
  }

  console.log('[Router] Classifying request:', lastMessage.content?.slice(0, 100))

  try {
    // Classify the request
    const classification = await classifyRequest(lastMessage.content as string, state)

    console.log('[Router] Classification:', classification)

    // Select target agent
    const targetAgent = classification.suggestedAgent

    // Extract relevant context
    const taskContext = extractRelevantContext(state, classification)

    // Create task
    const task: Task = {
      id: `task-${Date.now()}`,
      agent: targetAgent,
      description: extractTaskDescription(lastMessage.content as string, classification),
      status: 'active',
      context: taskContext,
      priority: classification.complexity === 'complex' ? 'high' : 'normal',
      createdAt: Date.now(),
      estimatedComplexity: classification.complexity,
    }

    // Update state
    return {
      activeAgent: targetAgent,
      previousAgent: 'router',
      handoffReason: classification.reasoning,
      taskQueue: [...state.taskQueue, task],
      messages: [
        ...state.messages,
        new AIMessage({
          content: `Routing to ${formatAgentName(targetAgent)} - ${classification.reasoning}`,
          name: 'Router',
          additional_kwargs: {
            classification,
            task,
          },
        }),
      ],
    }
  } catch (error) {
    console.error('[Router] Classification failed:', error)

    // Fallback to plot architect for most requests
    return {
      activeAgent: 'plot_architect',
      previousAgent: 'router',
      handoffReason: 'Fallback routing due to classification error',
      messages: [
        ...state.messages,
        new AIMessage({
          content: 'Routing to Plot Architect...',
          name: 'Router',
        }),
      ],
    }
  }
}

/**
 * Classify user request using fast model
 */
async function classifyRequest(message: string, state: WritersRoomState): Promise<Classification> {
  const model = new ChatOpenAI({
    modelName: 'gpt-4o-mini',
    temperature: 0.3,
  }).withStructuredOutput(ClassificationSchema)

  const prompt = buildClassificationPrompt(message, state)

  const result = await model.invoke([new SystemMessage(prompt)])

  return result as Classification
}

/**
 * Build classification prompt with context
 */
function buildClassificationPrompt(message: string, state: WritersRoomState): string {
  return `You are a Router Agent for a Writers Room AI system. Your job is to classify user requests and route them to the right specialist.

## User Request
"${message}"

## Current Context
- Phase: ${state.currentPhase}
- Beats created: ${state.beatBoard.length}
- Characters: ${state.characters.length}
- Has premise: ${!!state.episodePremise}
- Has script: ${!!state.script}

## Available Specialists

### writer
Use for: Script writing, dialogue, scenes, screenplay format
Best when: Beats are locked, ready to write actual script
Keywords: "write script", "dialogue", "scene", "screenplay"

### plot_architect  
Use for: Story structure, beats, plot points, pacing
Best when: Designing the story skeleton
Keywords: "beat", "plot", "structure", "story arc", "conflict"

### character_psychology
Use for: Character development, motivations, arcs, psychology
Best when: Building or analyzing characters
Keywords: "character", "motivation", "psychology", "arc", "development"

### premise_architect
Use for: World building, series bible, factions, world rules
Best when: Establishing world or updating bible sections
Keywords: "world", "bible", "factions", "rules", "premise", "setting"

### episode_premise_architect
Use for: Episode premise using Ozymandias framework
Best when: User asks for episode premise specifically
Keywords: "episode premise", "ozymandias", "episode hook"

### devils_advocate
Use for: Critical review, plot holes, consistency checks, critique
Best when: User wants feedback or quality check
Keywords: "review", "critique", "check", "improve", "thoughts", "feedback"

### planner
Use for: Complex multi-step tasks, breaking down big requests
Best when: Request has multiple components
Keywords: "create a season", "build everything", "full story"

## Classification Guidelines

1. **Complexity Assessment:**
   - Simple: Single, focused task (create one beat, update one character)
   - Moderate: 2-3 related tasks (create character with backstory)
   - Complex: Multi-step workflow (design full episode, create season arc)

2. **Planning Threshold:**
   - Set requiresPlanning=true if:
     * Request has 3+ distinct sub-tasks
     * Mentions "full", "complete", "entire", "season", "all"
     * Involves multiple agents working together

3. **Context-Aware Routing:**
   - If in PREMISE phase → prefer premise_architect
   - If in BREAKING phase → prefer plot_architect  
   - If in WRITING phase → prefer writer
   - If request is vague → route to agent who can ask questions

4. **Explicit Requests:**
   - If user says "episode premise" → always episode_premise_architect
   - If user says "review" or "thoughts" → always devils_advocate
   - If user says "write the script" → writer (if beats exist) or plot_architect (if no beats)

Analyze the request and return your classification.`
}

/**
 * Extract task description from user message
 */
function extractTaskDescription(message: string, classification: Classification): string {
  // Try to extract a clear task from the message
  const firstSentence = message.split(/[.!?]/)[0].trim()

  if (firstSentence.length > 10 && firstSentence.length < 100) {
    return firstSentence
  }

  // Fallback to category-based description
  const categoryDescriptions: Record<string, string> = {
    script_writing: 'Write script',
    premise_design: 'Design premise',
    episode_premise: 'Create episode premise',
    plot_structure: 'Structure plot',
    character_work: 'Develop character',
    review_critique: 'Review and critique',
    world_building: 'Build world',
    planning: 'Plan multi-step task',
    question: 'Answer question',
  }

  return categoryDescriptions[classification.category] || message.slice(0, 80)
}

/**
 * Extract relevant context for the task
 */
function extractRelevantContext(
  state: WritersRoomState,
  classification: Classification
): Record<string, any> {
  const context: Record<string, any> = {
    phase: state.currentPhase,
    userMessage: state.messages[state.messages.length - 1]?.content,
    classification: classification.category,
  }

  // Add relevant state based on classification
  switch (classification.category) {
    case 'script_writing':
      context.beats = state.beatBoard
      context.characters = state.characters
      context.currentScript = state.script
      break

    case 'plot_structure':
      context.beats = state.beatBoard
      context.characters = state.characters.map(c => ({ id: c.characterId, name: c.name }))
      context.unresolvedSetups = state.unresolvedSetups
      break

    case 'character_work':
      context.characters = state.characters
      context.beats = state.beatBoard.map(b => ({
        id: b.id,
        logline: b.logline,
        charactersInvolved: b.charactersInvolved,
      }))
      break

    case 'premise_design':
    case 'world_building':
      context.seriesBible = state.seriesBible
      context.characters = state.characters.map(c => ({ name: c.name, role: (c as any).role }))
      break

    case 'episode_premise':
      context.seriesBible = state.seriesBible
      context.premise = state.episodePremise
      break

    case 'review_critique':
      context.beats = state.beatBoard
      context.characters = state.characters
      context.seriesBible = state.seriesBible
      context.script = state.script
      break
  }

  return context
}

/**
 * Format agent name for display
 */
function formatAgentName(agent: string): string {
  const names: Record<string, string> = {
    writer: 'Writer',
    plot_architect: 'Plot Architect',
    character_psychology: 'Character Psychology',
    premise_architect: 'Premise Architect',
    episode_premise_architect: 'Episode Premise Architect',
    devils_advocate: "Devil's Advocate",
    planner: 'Planner',
  }

  return names[agent] || agent
}
