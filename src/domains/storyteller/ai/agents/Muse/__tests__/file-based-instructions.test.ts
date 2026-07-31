import { describe, it, expect } from 'vitest'
import { loadAgentInstructions } from '@/shared/agent-kernel/mastra/load-agent-instructions'
import { assembleFsAgent } from '@/shared/agent-kernel/mastra/load-fs-agent'
import { MuseAgentId } from '@/domains/storyteller/ai/agents/Muse/constants/muse-agents'
import museConfig from '../../../../../../mastra/agents/muse/config'
import rankerConfig from '../../../../../../mastra/agents/muse-ranker/config'

describe('file-based Muse instructions', () => {
  it('loads the blank-context Muse brief', () => {
    const md = loadAgentInstructions(MuseAgentId.Muse)
    expect(md).toContain('irreversible on-screen ACTION')
    expect(md).toContain('ACTION only')
  })

  it('loads the ranker scoring discipline', () => {
    const md = loadAgentInstructions(MuseAgentId.Ranker)
    expect(md).toContain('storyMotion (king)')
    expect(md).toContain('Reject generously')
  })

  it('assembles Muse + ranker from FS packages', () => {
    expect(assembleFsAgent(MuseAgentId.Muse, museConfig).id).toBe(MuseAgentId.Muse)
    expect(assembleFsAgent(MuseAgentId.Ranker, rankerConfig).id).toBe(MuseAgentId.Ranker)
  })
})
