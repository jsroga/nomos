import type { Agent } from '@mastra/core/agent'
import { getMastraInstance } from '../mastra-instance'
import { MastraAgentVersionStatus } from './constants/editor'

/** Code-registered agent on the production instance (no Editor overlay). */
function findRegisteredAgent(id: string): Agent | undefined {
  return Object.values(getMastraInstance().listAgents()).find(agent => agent.id === id)
}

/** Whether a code-defined agent is registered on the production instance. */
export function hasRegisteredAgent(id: string): boolean {
  return Boolean(findRegisteredAgent(id))
}

/**
 * Live agent with published Editor overlays applied.
 * Editor fail-closes when `instructions: true` and no published row exists;
 * then this returns the code-defined agent from `listAgents()`.
 */
export async function getPublishedAgent(id: string): Promise<Agent> {
  const mastra = getMastraInstance()
  try {
    return await mastra.getAgentById(id, {
      status: MastraAgentVersionStatus.Published,
    })
  } catch (err: unknown) {
    const code = findRegisteredAgent(id)
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
