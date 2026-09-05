import { SkillCatalogId } from '@/shared/agent-kernel/mastra/skill-catalog-ids'
import { ManuscriptMode } from '@/domains/storyteller/core/types/enums'
import {
  packInvolvedVoiceFingerprints,
  type NamedVoiceFingerprint,
} from '@/domains/storyteller/core/voice/pack-involved-voice-fingerprints'

export enum ManuscriptSectionScope {
  GenerateNext = 'generate-next',
  Regenerate = 'regenerate',
}

export enum ManuscriptSectionBriefHeading {
  Mode = '## Manuscript mode',
  FormatSkill = '## Format skill',
  Scope = '## Scope',
  Premise = '## Episode premise',
  Beat = '## Beat card',
  Canon = '## Author canon',
  Voice = '## Voice fingerprints',
  Span = '## Existing section',
}

enum ManuscriptSectionBriefJoin {
  Blocks = '\n\n',
  Line = '\n',
}

enum BeatCardLine {
  SequencePrefix = 'sequence',
}

export interface PackManuscriptSectionBriefInput {
  mode: ManuscriptMode
  scope: ManuscriptSectionScope
  beat: {
    sequence: number
    logline: string
    content?: string | null
  }
  episodePremise: string
  authorCanon: string
  spanText?: string
  charactersInvolved?: string[]
  fingerprints?: readonly NamedVoiceFingerprint[]
}

function labeled(heading: ManuscriptSectionBriefHeading, body: string): string {
  const trimmed = body.trim()
  if (trimmed.length === 0) return ''
  return `${heading}${ManuscriptSectionBriefJoin.Line}${trimmed}`
}

function formatSkillId(mode: ManuscriptMode): SkillCatalogId {
  return mode === ManuscriptMode.Novel
    ? SkillCatalogId.ManuscriptNovel
    : SkillCatalogId.ManuscriptScript
}

export function packManuscriptSectionBrief(input: PackManuscriptSectionBriefInput): string {
  const beatBody = [
    `${BeatCardLine.SequencePrefix} ${input.beat.sequence}`,
    input.beat.logline.trim(),
    (input.beat.content ?? '').trim(),
  ]
    .filter(part => part.length > 0)
    .join(ManuscriptSectionBriefJoin.Line)

  const parts = [
    labeled(ManuscriptSectionBriefHeading.Mode, input.mode),
    labeled(ManuscriptSectionBriefHeading.FormatSkill, formatSkillId(input.mode)),
    labeled(ManuscriptSectionBriefHeading.Scope, input.scope),
    labeled(ManuscriptSectionBriefHeading.Premise, input.episodePremise),
    labeled(ManuscriptSectionBriefHeading.Beat, beatBody),
    labeled(ManuscriptSectionBriefHeading.Canon, input.authorCanon),
    labeled(
      ManuscriptSectionBriefHeading.Voice,
      packInvolvedVoiceFingerprints(input.fingerprints ?? [], input.charactersInvolved ?? [])
    ),
    labeled(ManuscriptSectionBriefHeading.Span, input.spanText ?? ''),
  ]
  return parts.filter(part => part.length > 0).join(ManuscriptSectionBriefJoin.Blocks)
}
