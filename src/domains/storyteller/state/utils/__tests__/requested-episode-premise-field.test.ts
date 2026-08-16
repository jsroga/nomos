import { describe, expect, it } from 'vitest'
import { ActionType, BibleSection } from '@/domains/storyteller/core/types/enums'
import { ApprovalActionStatus } from '@/shared/agent-kernel/action-wire'
import { EpisodePremiseWriteField } from '@/domains/storyteller/core/utils/requested-episode-premise-field'
import { narrowEpisodePremiseProposal } from '../requested-episode-premise-field'
import type { ProposedBibleSectionUpdate } from '../propose-assistant-bible-update'

const FULL_PREMISE = {
  logline: 'A body ages to death in a city that forbids dying.',
  protagonistHook: 'Warden Sera is called to a woundless corpse.',
  fatalFlaw: 'She trusts the ledger more than the living.',
  tenPointsPlan: ['Routine day', 'Impossible body', 'Cover-up'],
}

function proposal(premise: Record<string, unknown>): ProposedBibleSectionUpdate {
  return {
    section: BibleSection.EPISODE_PREMISE,
    preview: { premise },
    dedupeKey: 'episode-premise',
    action: {
      type: ActionType.UPDATE_EPISODE_PREMISE,
      payload: { episodeId: '8db804d0-1c39-498e-97a5-dfd7eb828789', premise },
      status: ApprovalActionStatus.PENDING,
      id: 'premise',
    },
  }
}

describe('narrowEpisodePremiseProposal', () => {
  it('keeps only the logline when description was requested', () => {
    const narrowed = narrowEpisodePremiseProposal(
      proposal(FULL_PREMISE),
      EpisodePremiseWriteField.Logline,
    )
    expect(narrowed.preview).toEqual({ premise: { logline: FULL_PREMISE.logline } })
    expect(recordPayloadPremise(narrowed)).toEqual({ logline: FULL_PREMISE.logline })
  })

  it('leaves a full premise write alone when no field was requested', () => {
    expect(narrowEpisodePremiseProposal(proposal(FULL_PREMISE), undefined).preview).toEqual({
      premise: FULL_PREMISE,
    })
  })
})

function recordPayloadPremise(update: ProposedBibleSectionUpdate): Record<string, unknown> {
  const payload = update.action.payload
  if (typeof payload !== 'object' || payload === null) return {}
  const premise = Reflect.get(payload, 'premise')
  if (typeof premise !== 'object' || premise === null) return {}
  return { ...premise }
}
