import { STUDIO_AGENT_DESCRIPTION_MAX } from '../mastra/constants/studio-workspace'
import {
  FileAgentCatalogBody,
  FileAgentCatalogId,
  LoopCreatorPurposeBody,
  LoopCreatorPurposeSuffix,
  PromptCatalogDomain,
  PromptCatalogJoin,
  PromptCatalogTag,
  StudioPurposeBody,
} from './constants/prompt-catalog'

const FILE_AGENT_CATALOG_BODY: Record<string, string> = {
  [FileAgentCatalogId.Storyteller]: FileAgentCatalogBody.Storyteller,
  [FileAgentCatalogId.GrrmAuthor]: FileAgentCatalogBody.GrrmAuthor,
  [FileAgentCatalogId.BeatPlanner]: FileAgentCatalogBody.BeatPlanner,
  [FileAgentCatalogId.Continuity]: FileAgentCatalogBody.Continuity,
  [FileAgentCatalogId.Prose]: FileAgentCatalogBody.Prose,
  [FileAgentCatalogId.Stakes]: FileAgentCatalogBody.Stakes,
  [FileAgentCatalogId.Dialogue]: FileAgentCatalogBody.Dialogue,
  [FileAgentCatalogId.Muse]: FileAgentCatalogBody.Muse,
  [FileAgentCatalogId.MuseRanker]: FileAgentCatalogBody.MuseRanker,
  [FileAgentCatalogId.Autonomous]: FileAgentCatalogBody.Autonomous,
}

export function promptCatalogDescription(domain: PromptCatalogDomain, body: string): string {
  const prefix = `${domain}${PromptCatalogJoin.Domain}`
  const line = body.startsWith(prefix) ? body : `${prefix}${body}`
  if (line.length <= STUDIO_AGENT_DESCRIPTION_MAX) return line
  return line.slice(0, STUDIO_AGENT_DESCRIPTION_MAX)
}

export function catalogDomainFromTags(tags: string[] | undefined): PromptCatalogDomain {
  if (tags?.includes(PromptCatalogTag.GameDesign)) return PromptCatalogDomain.GameDesign
  if (tags?.includes(PromptCatalogTag.Evaluation)) return PromptCatalogDomain.Eval
  return PromptCatalogDomain.Shared
}

export function fileAgentCatalogDescription(agentId: string): string {
  const body = FILE_AGENT_CATALOG_BODY[agentId] ?? FileAgentCatalogBody.Fallback
  return promptCatalogDescription(PromptCatalogDomain.Storyteller, body)
}

export function studioPurposeDescription(body: StudioPurposeBody): string {
  return promptCatalogDescription(PromptCatalogDomain.Studio, body)
}

export function loopCreatorPurposeDescription(body: LoopCreatorPurposeBody): string {
  return promptCatalogDescription(PromptCatalogDomain.LoopCreator, body)
}

export function loopCreatorInternalPurposeDescription(body: LoopCreatorPurposeBody): string {
  return promptCatalogDescription(
    PromptCatalogDomain.LoopCreator,
    `${body}${LoopCreatorPurposeSuffix.InternalNotStudio}`,
  )
}
