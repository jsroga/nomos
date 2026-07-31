import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  fileAgentsRootDir,
  loadAgentInstructions,
  stripMarkdownFrontmatter,
} from '@/shared/agent-kernel/mastra/load-agent-instructions'
import { composeChatAdapterInstructions } from '../storyteller/compose-instructions'
import type { EntityLinkRequirements } from '@/domains/storyteller/config/storyteller-config'
import {
  AutonomousAuthorId,
  AutonomousAuthorSkillDir,
  AUTONOMOUS_INSTRUCTION_BLOCK_SEPARATOR,
  GOAL_JUDGE_FILE_ENCODING,
  GOAL_JUDGE_SKILL_PATH,
} from './constants'

export function loadAutonomousGoalJudgePrompt(): string {
  return stripMarkdownFrontmatter(
    readFileSync(
      join(
        fileAgentsRootDir(),
        AutonomousAuthorId.Agent,
        AutonomousAuthorSkillDir.Skills,
        GOAL_JUDGE_SKILL_PATH
      ),
      GOAL_JUDGE_FILE_ENCODING
    )
  )
}

/**
 * Autonomous author instructions: always-on FS brief + chat-adapter tool protocol
 * (entity-link minimums) so bible reads stay consistent with the chat agent.
 */
export function composeAutonomousAuthorInstructions(reqs: EntityLinkRequirements): string {
  const autonomousBrief = loadAgentInstructions(AutonomousAuthorId.Agent)
  const chatProtocol = composeChatAdapterInstructions(reqs)
  return [autonomousBrief, chatProtocol].join(AUTONOMOUS_INSTRUCTION_BLOCK_SEPARATOR)
}
