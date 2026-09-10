import type { Agent } from '@mastra/core/agent'
import { getMastraInstance } from '../mastra-instance'
import { MastraAgentVersionStatus } from './constants/editor'
import { overlayAgentHasTools } from './editor-overlay'

/** Code-registered agent on the production instance (no Editor overlay). */
function findRegisteredAgent(id: string): Agent | undefined {
  return Object.values(getMastraInstance().listAgents()).find(agent => agent.id === id)
}

/** Whether a code-defined agent is registered on the production instance. */
export function hasRegisteredAgent(id: string): boolean {
  return Boolean(findRegisteredAgent(id))
}

function resolveLiveAgent(id: string, published: Agent, code: Agent | undefined): Agent {
  if (overlayAgentHasTools(id)) return published
  return code ?? published
}

/**
 * Live agent with published Editor overlays applied.
 * Empty tool membership in JSON falls back to the code catalog so chat never
 * loses tools. Instruction overlays still apply via loadPublishedOrFileBrief.
 */
export async function getPublishedAgent(id: string): Promise<Agent> {
  const mastra = getMastraInstance()
  const code = findRegisteredAgent(id)
  try {
    const published = await mastra.getAgentById(id, {
      status: MastraAgentVersionStatus.Published,
    })
    return resolveLiveAgent(id, published, code)
  } catch (err: unknown) {
    if (code) return code
    throw err
  }
}

/** Published overlay when the instance has the id; otherwise the code agent. */
export async function getPublishedAgentOr(id: string, fallback: Agent): Promise<Agent> {
  if (!hasRegisteredAgent(id)) return fallback
  try {
    return await getPublishedAgent(id)
  } catch {
    return fallback
  }
}
