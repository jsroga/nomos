import { BibleSection } from '@/domains/storyteller/core/types/enums'
import {
  narrowPremiseRecord,
} from '@/domains/storyteller/core/utils/requested-episode-premise-field'
import { recordFromJson, readString } from '@/shared/data/json-guards'
import type { ProposedBibleSectionUpdate } from '@/domains/storyteller/state/utils/propose-assistant-bible-update'

export {
  EpisodeDescriptionMarker,
  EpisodePremiseWriteField,
  requestedEpisodePremiseField,
} from '@/domains/storyteller/core/utils/requested-episode-premise-field'

export function narrowEpisodePremiseProposal(
  proposal: ProposedBibleSectionUpdate,
  field: string | undefined,
): ProposedBibleSectionUpdate {
  if (!field || proposal.section !== BibleSection.EPISODE_PREMISE) return proposal
  const preview = recordFromJson(proposal.preview)
  const premise = narrowPremiseRecord(
    recordFromJson(preview.premise ?? preview.episodePremise),
    field,
  )
  if (Object.keys(premise).length === 0) return proposal
  const payload = recordFromJson(proposal.action.payload)
  return {
    ...proposal,
    preview: { premise },
    action: {
      ...proposal.action,
      payload: {
        ...payload,
        premise,
        episodeId: readString(payload.episodeId) ?? payload.episodeId ?? null,
      },
    },
    dedupeKey: `${proposal.dedupeKey}:${field}`,
  }
}
