/**
 * Base Agent V2 Utilities
 *
 * Shared utilities for all V2 agents with handoffs & skills support.
 * Reduces code duplication and ensures consistent behavior.
 */

import { WritersRoomState, Task, CompletedTask } from '../graph/state'
import { AIMessage, SystemMessage } from '@langchain/core/messages'
import { getModel } from '../config/model-config'
import { getSafeMessageHistory } from '../utils/message-utils'
import { buildAgentContext } from '../utils/context-builder'
import { handoffTool } from '../tools/handoff-tool'
import { completeTaskTool } from '../tools/complete-task-tool'
import { getSkillLoader, getSkillsForAgent, getRecommendedSkills } from '../skills'
import { loadPromptCached } from '../prompts/hub-loader'

export interface AgentV2Config {
  agentName: string
  agentKey: string // For model config and skill lookup
  promptId: string // LangChain Hub prompt ID
  fallbackPrompt: string // Fallback if Hub unavailable
  requiredPhases?: string[] // Phases where this agent can operate
  autoLoadSkills?: boolean // Auto-load recommended skills
}

export interface AgentV2Result {
  messages: AIMessage[]
  stateUpdates?: Partial<WritersRoomState>
  handoffOccurred?: boolean
  taskCompleted?: boolean
}

/**
 * Base execution function for V2 agents
 */
export async function executeAgentV2(
  state: WritersRoomState,
  config: AgentV2Config
): Promise<Partial<WritersRoomState>> {
  const {
    agentName,
    agentKey,
    promptId,
    fallbackPrompt,
    requiredPhases,
    autoLoadSkills = true,
  } = config

  // 1. Check if this agent is active
  if (state.activeAgent !== agentKey) {
    return { messages: [] }
  }

  console.log(`[${agentName} V2] Processing task`)

  // 2. Get current task
  const currentTask = state.taskQueue.find(t => t.agent === agentKey && t.status === 'active')

  if (!currentTask) {
    console.warn(`[${agentName} V2] Called but no active task`)
    return {
      messages: [
        new AIMessage({
          content: `${agentName} ready, but no task assigned.`,
          name: agentName,
        }),
      ],
    }
  }

  // 3. Check phase requirements
  if (requiredPhases && !requiredPhases.includes(state.currentPhase)) {
    console.warn(
      `[${agentName} V2] Wrong phase - current: ${state.currentPhase}, required: ${requiredPhases.join(' or ')}`
    )

    // Handoff back to router
    return {
      messages: [
        new AIMessage({
          content: `Cannot operate in ${state.currentPhase} phase. Returning to router.`,
          name: agentName,
        }),
      ],
      activeAgent: 'router',
      previousAgent: agentKey,
      handoffReason: 'Phase requirements not met',
    }
  }

  // 4. Load skills
  const skillLoader = getSkillLoader()
  const agentSkills = getSkillsForAgent(agentKey)

  // Register skills
  agentSkills.forEach(skill => skillLoader.registerSkill(skill))

  // Load recommended skills for the task
  let skillContent = ''
  if (autoLoadSkills) {
    const recommendedSkills = getRecommendedSkills(inferTaskType(currentTask.description))
    const skillIds = recommendedSkills.map(s => s.id)

    if (skillIds.length > 0) {
      skillContent = await skillLoader.loadSkills(skillIds)
      console.log(`[${agentName} V2] Loaded skills:`, skillLoader.getLoadedSkillNames())
    }
  }

  // 5. Load prompt from Hub
  const loadedPrompt = await loadPromptCached(promptId as any)
  const promptMessages =
    (loadedPrompt.prompt as any).promptMessages || (loadedPrompt.prompt as any).messages || []
  const systemMessage = promptMessages.find(
    (m: any) => m.lc_id?.[3] === 'SystemMessagePromptTemplate' || m._type === 'system'
  )
  const systemTemplate =
    systemMessage?.prompt?.template || systemMessage?.template || fallbackPrompt

  // 6. Build prompt with skills and task context
  const contextXml = buildAgentContext(state, state.currentPhase)

  const combinedSystem = [
    systemTemplate,
    '\n\n## Your Current Task',
    currentTask.description,
    skillContent ? '\n\n## Specialist Knowledge\n' + skillContent : '',
    '\n\n## Story Context',
    contextXml,
    '\n\n## Available Tools',
    '- handoff_to_specialist: Transfer control to another specialist if their expertise is needed',
    '- complete_task: Mark your task as complete when done',
    '\n\n## Instructions',
    'Complete the assigned task. When finished, call complete_task with a summary of what you accomplished.',
    'If you need another specialist\'s help, use handoff_to_specialist.',
  ].join('\n')

  const conversationMessages = getSafeMessageHistory(state.messages, 5).filter(
    m => m._getType() !== 'system'
  )

  // 7. Bind tools and invoke
  const model = getModel(agentKey).bindTools([handoffTool, completeTaskTool])

  const messages = [new SystemMessage(combinedSystem), ...conversationMessages]

  try {
    const response = await model.invoke(messages)

    // 7. Handle tool calls
    if (response.tool_calls && response.tool_calls.length > 0) {
      const toolCall = response.tool_calls[0]

      // Handoff
      if (toolCall.name === 'handoff_to_specialist') {
        return handleHandoff(response, state, currentTask, agentKey, agentName)
      }

      // Complete
      if (toolCall.name === 'complete_task') {
        return handleTaskCompletion(response, state, currentTask, agentName)
      }
    }

    // 8. Direct response (no tool calls)
    const namedMessage = new AIMessage({
      content: response.content,
      name: agentName,
    })

    return {
      messages: [namedMessage],
    }
  } catch (error) {
    console.error(`[${agentName} V2] Error:`, error)

    return {
      messages: [
        new AIMessage({
          content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          name: agentName,
        }),
      ],
    }
  }
}

/**
 * Handle handoff to another agent
 */
function handleHandoff(
  response: any,
  state: WritersRoomState,
  currentTask: Task,
  fromAgent: string,
  fromAgentName: string
): Partial<WritersRoomState> {
  const args = response.tool_calls[0].args as any

  console.log(`[Handoff] ${fromAgent} → ${args.targetAgent}`)

  // Create new task for target agent
  const newTask: Task = {
    id: `task-${Date.now()}`,
    agent: args.targetAgent,
    description: args.task,
    status: 'active',
    context: {
      ...args.context,
      handedOffFrom: fromAgent,
      originalTask: currentTask.description,
    },
    priority: args.priority || currentTask.priority,
    createdAt: Date.now(),
  }

  return {
    messages: [response],
    activeAgent: args.targetAgent,
    previousAgent: fromAgent,
    handoffReason: args.reason || 'Specialist expertise needed',
    taskQueue: [...state.taskQueue.filter(t => t.id !== currentTask.id), newTask],
  }
}

/**
 * Handle task completion
 */
function handleTaskCompletion(
  response: any,
  state: WritersRoomState,
  currentTask: Task,
  agentName: string
): Partial<WritersRoomState> {
  const args = response.tool_calls[0].args as any

  console.log(`[Task Complete] ${agentName}: ${args.summary}`)

  const completedTask: CompletedTask = {
    ...currentTask,
    status: 'completed',
    result: args.summary,
    nextAction: args.nextSteps,
    artifacts: args.artifacts,
    completedAt: Date.now(),
  }

  return {
    messages: [
      new AIMessage({
        content: args.summary,
        name: agentName,
        additional_kwargs: {
          taskComplete: true,
          nextSteps: args.nextSteps,
          artifacts: args.artifacts,
        },
      }),
    ],
    taskQueue: state.taskQueue.filter(t => t.id !== currentTask.id),
    completedTasks: [...state.completedTasks, completedTask],
    activeAgent: undefined, // Return control
    loadedSkills: [], // Clear loaded skills
  }
}

/**
 * Infer task type from description
 */
function inferTaskType(description: string): string {
  const lower = description.toLowerCase()

  if (lower.includes('script') || lower.includes('write')) return 'write_script'
  if (lower.includes('dialogue') || lower.includes('conversation')) return 'write_dialogue'
  if (lower.includes('beat') || lower.includes('plot')) return 'create_beat'
  if (lower.includes('character')) return 'design_character'
  if (lower.includes('review') || lower.includes('critique')) return 'review_plot'
  if (lower.includes('world') || lower.includes('bible')) return 'build_world'
  if (lower.includes('episode') && lower.includes('premise')) return 'design_episode'

  return 'unknown'
}
