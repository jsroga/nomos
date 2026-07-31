import { describe, it, expect } from 'vitest'
import { loadAgentInstructions } from '@/shared/agent-kernel/mastra/load-agent-instructions'
import { assembleFsAgent } from '@/shared/agent-kernel/mastra/load-fs-agent'
import { CriticAgentId } from '@/domains/storyteller/ai/agents/critics/constants/critic-agents'
import continuityConfig from '../../../../../../mastra/agents/continuity-critic/config'
import proseConfig from '../../../../../../mastra/agents/prose-critic/config'
import stakesConfig from '../../../../../../mastra/agents/stakes-critic/config'

describe('file-based critic instructions', () => {
  it('loads the continuity brief from instructions.md', () => {
    const md = loadAgentInstructions(CriticAgentId.Continuity)
    expect(md).toContain('knowledge they do not possess')
    expect(md).toContain('Diagnosis only')
  })

  it('loads the prose brief from instructions.md', () => {
    const md = loadAgentInstructions(CriticAgentId.Prose)
    expect(md).toContain('line-level prose findings')
    expect(md).toContain('POV breaks')
  })

  it('loads the stakes brief from instructions.md', () => {
    const md = loadAgentInstructions(CriticAgentId.Stakes)
    expect(md).toContain('stakes/cost findings')
    expect(md).toContain('Unearned victories')
  })

  it('assembles production critics from FS packages', () => {
    expect(assembleFsAgent(CriticAgentId.Continuity, continuityConfig).id).toBe(
      CriticAgentId.Continuity
    )
    expect(assembleFsAgent(CriticAgentId.Prose, proseConfig).id).toBe(CriticAgentId.Prose)
    expect(assembleFsAgent(CriticAgentId.Stakes, stakesConfig).id).toBe(CriticAgentId.Stakes)
  })
})
