/**
 * Chat integration (Vitest live): drive Storyteller controller, score with
 * Mastra goal-reached LLM-as-judge. Excluded from `test:unit` (`*.e2e.test.ts`).
 *
 *   CONTROLLER_E2E_PROJECT_ID=<uuid> npm run test:live -- <this file>
 *
 * Needs: DATABASE_URL, an LLM key, CONTROLLER_E2E_PROJECT_ID (scratch project).
 */

import { describe, expect, it } from 'vitest'
import type {
  AgentControllerEvent,
  MastraDBMessage,
  Session,
} from '@mastra/core/agent-controller'
import { getStorytellerController } from '@/domains/storyteller/core/io/mastra-runtime'
import { buildStorytellerRequestContext } from '@/domains/storyteller/ai/request-context'
import {
  StorytellerControllerMode,
  buildStorytellerControllerModes,
} from '@/domains/storyteller/ai/controller/storyteller-controller'
import { goalReachedScorer } from '@/shared/agent-kernel/scorers'

const projectId = process.env.CONTROLLER_E2E_PROJECT_ID ?? ''
const hasLlmKey = Boolean(
  process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY
)
const ready = Boolean(process.env.DATABASE_URL && hasLlmKey && projectId)

const PROJECT_TAG = 'projectId'
/** One minute per expect — integration chat turn + judge. */
const EXPECT_TIMEOUT_MS = 60_000
const PASS_SCORE = 0.7

enum ChatGoalPrompt {
  UserMessage = 'Confirm in one short sentence that you are the Storyteller assistant for this project. Do not call tools or change anything.',
  Goal = 'The assistant confirms it is the Storyteller helper in one short sentence, without mutating project data.',
}

interface Harness {
  session: Session<unknown>
  events: AgentControllerEvent[]
}

function textFromMessage(message: MastraDBMessage): string {
  let text = ''
  for (const part of message.content.parts) {
    if (part.type === 'text' && 'text' in part && typeof part.text === 'string') {
      text += part.text
    }
  }
  return text
}

function collectAssistantText(events: AgentControllerEvent[]): string {
  const chunks: string[] = []
  for (const event of events) {
    if (event.type !== 'message_end') continue
    if (event.message.role !== 'assistant') continue
    const text = textFromMessage(event.message).trim()
    if (text) chunks.push(text)
  }
  return chunks.join('\n')
}

async function createHarness(): Promise<Harness> {
  const controller = await getStorytellerController()
  const session = await controller.createSession({
    resourceId: `chat-goal-e2e-${Date.now()}`,
    tags: { [PROJECT_TAG]: projectId },
  })

  const chatMode = buildStorytellerControllerModes().find(
    mode => mode.id === StorytellerControllerMode.Chat
  )
  for (const toolName of chatMode?.availableTools ?? []) {
    await session.permissions.setForTool({ toolName, policy: 'allow' })
  }

  const events: AgentControllerEvent[] = []
  session.subscribe(event => {
    events.push(event)
  })

  return { session, events }
}

describe.skipIf(!ready)('storyteller chat integration', () => {
  it(
    'replies on-topic to a simple Storyteller identity goal',
    async () => {
      const harness = await createHarness()
      const userMessage = ChatGoalPrompt.UserMessage

      await harness.session.sendMessage({
        content: userMessage,
        requestContext: buildStorytellerRequestContext({ projectId }),
      })

      const assistantText = collectAssistantText(harness.events)
      expect(assistantText.length).toBeGreaterThan(0)

      const conversation = [`User: ${userMessage}`, `Assistant: ${assistantText}`].join('\n')
      const judged = await goalReachedScorer.run({
        input: { goal: ChatGoalPrompt.Goal, conversation },
        output: assistantText,
      })

      expect(judged.score, judged.reason).toBeGreaterThanOrEqual(PASS_SCORE)
    },
    EXPECT_TIMEOUT_MS
  )
})
