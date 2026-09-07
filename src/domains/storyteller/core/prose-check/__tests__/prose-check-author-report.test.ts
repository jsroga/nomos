import { describe, expect, it } from 'vitest'
import { formatCriticReport } from '@/domains/storyteller/ai/agents/critics/critic-schema'
import { BeatDraftLintReportName } from '@/domains/storyteller/ai/workflows/constants/beat-draft-workflow'
import { emptyBeatDraftCanon, DraftBeatId } from '@/domains/storyteller/core/types/beat-draft-canon'
import { CausalFindingCopy } from '../constants'
import { runSyncProseCheck } from '../run-sync'

const CORKBOARD_UUIDS = [
  '05ef937b-a073-49f7-88ed-cf4136084a74',
  '0935af94-6ec8-450e-ab58-0cd35a48e4fe',
  '193661f8-bfa9-4c6c-9da2-10cc0b6bd270',
  '2769181a-e1e6-48c7-85c2-dec36cf274c0',
  '342068ed-e80e-4d68-bb35-e9033f7ad1dd',
  '433d7454-5fb8-4292-9c14-8458af3863d0',
  '5c312b57-c1d6-4250-ab41-c313ea3c090a',
  '73448b46-cc2a-47f0-8b6b-fffd2a81583f',
  '7350e813-a261-49b0-9e63-eac200f6d346',
  '98e7b06f-047b-4767-8664-6a16f1512752',
  '9e374dde-b7a7-4e85-bd49-fab97589d691',
  'a33bdf6f-99a8-4d66-b193-d7089ea716ec',
  'db8b4230-ee3c-473e-9e2f-68b48d6fa2ed',
  'deeaa080-8020-4cb4-b824-f778280c0f9c',
  'ef57873f-0e91-4f90-8c1a-1aa3c2b07362',
  'f0cd4bee-2944-41a0-a8af-9abd3657d91c',
  'f69e8f74-4d1a-479c-be3c-5a9e3662a2ba',
  'f87f0fa1-b5d2-4ede-8c70-84bc9cad4a65',
] as const

function unusedCorkboardCanon() {
  return emptyBeatDraftCanon({
    nextSequence: CORKBOARD_UUIDS.length + 1,
    beats: CORKBOARD_UUIDS.map((id, index) => ({
      id,
      sequence: index + 1,
      content: `INT. BEAT ${index + 1}`,
      causalDependencies: [],
      beatType: 'scene',
    })),
  })
}

describe('ProseCheck author report', () => {
  it('does not dump corkboard ids or a phantom draft orphan on a next-beat draft', () => {
    const findings = runSyncProseCheck({
      draft: 'INT. THE ALCHEMISTS WORKSHOP',
      canon: unusedCorkboardCanon(),
      characters: ['Sera'],
    })
    const report = formatCriticReport(BeatDraftLintReportName.ProseCheck, { findings })
    for (const id of CORKBOARD_UUIDS) {
      expect(report).not.toContain(id)
    }
    expect(report).not.toContain(`"${DraftBeatId.Draft}"`)
    expect(report).not.toContain(CausalFindingCopy.DroppedWhy)
    expect(report).not.toContain(CausalFindingCopy.OrphanWhy)
  })
})
