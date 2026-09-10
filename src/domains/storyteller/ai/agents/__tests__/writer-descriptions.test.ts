import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { STUDIO_AGENT_DESCRIPTION_MAX } from '@/shared/agent-kernel/mastra/constants/studio-workspace'
import { FileAgentCatalogId, PromptCatalogJoin } from '@/shared/agent-kernel/prompts/constants/prompt-catalog'
import { fileAgentCatalogDescription } from '@/shared/agent-kernel/prompts/prompt-catalog-copy'
import {
  GrrmAuthorAgentDescription,
  StorytellerAgentDescription,
} from '../../constants/agent-identity'
import { CriticAgentDescription } from '../critics/constants/critic-agents'
import { MuseAgentDescription } from '../Muse/constants/muse-agents'
import { AutonomousAuthorDescription } from '../../../../../mastra/agents/storyteller-autonomous-author/constants'
import { storytellerRuntimeAgents } from '@/domains/storyteller/core/io/mastra-runtime'
import { FileEncoding } from '@/shared/data/constants/protocol'

enum PurposeForbidden {
  RunBeatDraft = 'run_beat_draft',
  BeatDraftWorkflow = 'beat-draft-workflow',
  Heading = '#',
}

function assertPurposeLine(description: string): void {
  expect(description.length).toBeGreaterThan(0)
  expect(description.length).toBeLessThanOrEqual(STUDIO_AGENT_DESCRIPTION_MAX)
  expect(description).toContain(PromptCatalogJoin.Domain)
  expect(description).not.toContain(PurposeForbidden.Heading)
  expect(description).not.toContain(PurposeForbidden.RunBeatDraft)
  expect(description).not.toContain(PurposeForbidden.BeatDraftWorkflow)
}

describe('writer Studio descriptions', () => {
  it('keeps identity copy and runtime agents under the Studio Purpose max', () => {
    const descriptions = [
      StorytellerAgentDescription.Storyteller,
      GrrmAuthorAgentDescription.GrrmAuthor,
      GrrmAuthorAgentDescription.BeatPlanner,
      CriticAgentDescription.Continuity,
      CriticAgentDescription.Prose,
      CriticAgentDescription.Stakes,
      CriticAgentDescription.Dialogue,
      MuseAgentDescription.Muse,
      MuseAgentDescription.Ranker,
      AutonomousAuthorDescription.Agent,
      ...Object.values(storytellerRuntimeAgents).map(agent => agent.getDescription()),
    ]
    for (const description of descriptions) {
      assertPurposeLine(description)
    }
    expect(StorytellerAgentDescription.Storyteller).toBe(
      fileAgentCatalogDescription(FileAgentCatalogId.Storyteller),
    )
  })

  it('keeps instructions.md first line equal to Purpose', () => {
    const root = join(process.cwd(), 'src/mastra/agents')
    const rows: Array<[string, string]> = [
      [FileAgentCatalogId.Storyteller, fileAgentCatalogDescription(FileAgentCatalogId.Storyteller)],
      [FileAgentCatalogId.GrrmAuthor, fileAgentCatalogDescription(FileAgentCatalogId.GrrmAuthor)],
      [FileAgentCatalogId.BeatPlanner, fileAgentCatalogDescription(FileAgentCatalogId.BeatPlanner)],
      [FileAgentCatalogId.Continuity, fileAgentCatalogDescription(FileAgentCatalogId.Continuity)],
      [FileAgentCatalogId.Prose, fileAgentCatalogDescription(FileAgentCatalogId.Prose)],
      [FileAgentCatalogId.Stakes, fileAgentCatalogDescription(FileAgentCatalogId.Stakes)],
      [FileAgentCatalogId.Dialogue, fileAgentCatalogDescription(FileAgentCatalogId.Dialogue)],
      [FileAgentCatalogId.Muse, fileAgentCatalogDescription(FileAgentCatalogId.Muse)],
      [FileAgentCatalogId.MuseRanker, fileAgentCatalogDescription(FileAgentCatalogId.MuseRanker)],
      [FileAgentCatalogId.Autonomous, fileAgentCatalogDescription(FileAgentCatalogId.Autonomous)],
    ]
    for (const [id, purpose] of rows) {
      const first = readFileSync(join(root, id, 'instructions.md'), FileEncoding.Utf8)
        .split('\n')[0]
        ?.trim()
      expect(first).toBe(purpose)
    }
  })
})
