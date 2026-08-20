/**
 * Registry-driven ContinuityCritic check for one generatable section.
 */

import '@/shared/data/server-guard'
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { generateStructured } from '../agents/critics/generate-structured'
import { continuityCritic } from '../agents/critics'
import { AlignmentSection } from '../../core/constants/alignment-registry'
import {
  STORYTELLER_PROJECT_ID,
  STORYTELLER_EPISODE_ID,
  requestContextString,
} from '../request-context'
import { BibleToolError } from './bible-tools-update'
import {
  CHECK_SECTION_ALIGNMENT_TOOL_DESC,
  CHECK_SECTION_ALIGNMENT_TOOL_ID,
} from './manage-tools-wire'
import {
  buildAlignmentScanJobs,
  filterAlignmentScanJobs,
} from '../workflows/alignment-scan'
import {
  ContinuityFindingSchema,
  ContinuityScanReportSchema,
} from '../workflows/fix-inconsistencies-schema'
import {
  FIX_INCONSISTENCIES_PROMPT_JOIN,
  FIX_INCONSISTENCIES_SCAN_INSTRUCTIONS,
} from '../workflows/constants/fix-inconsistencies-workflow'

enum SectionAlignmentCopy {
  NoJobs = 'No related canon to check for that section.',
  NoFindings = 'No section-alignment issues found.',
  FindingsPrefix = 'Found ',
  FindingsSuffix = ' alignment finding(s).',
}

const CheckSectionAlignmentInputSchema = z.object({
  section: z.nativeEnum(AlignmentSection).describe('Section that was generated or should be checked'),
  episodeId: z.string().uuid().optional().describe('Open episode for premise/beats checks'),
})

const CheckSectionAlignmentOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  findings: z.array(ContinuityFindingSchema),
})

export const checkSectionAlignmentTool = createTool({
  id: CHECK_SECTION_ALIGNMENT_TOOL_ID,
  description: CHECK_SECTION_ALIGNMENT_TOOL_DESC,
  inputSchema: CheckSectionAlignmentInputSchema,
  outputSchema: CheckSectionAlignmentOutputSchema,
  execute: async (inputData, context) => {
    const projectId = requestContextString(context.requestContext, STORYTELLER_PROJECT_ID)
    const episodeId =
      requestContextString(context.requestContext, STORYTELLER_EPISODE_ID) ?? inputData.episodeId

    if (!projectId) {
      return {
        success: false,
        message: BibleToolError.ProjectIdRequired,
        findings: [],
      }
    }

    const { assembleCanon } = await import(
      '@/domains/storyteller/ai/workflows/fix-inconsistencies-default-deps'
    )
    const canon = await assembleCanon(projectId)
    const jobs = filterAlignmentScanJobs(
      buildAlignmentScanJobs(canon),
      inputData.section,
      episodeId
    )
    if (jobs.length === 0) {
      return { success: true, message: SectionAlignmentCopy.NoJobs, findings: [] }
    }

    const report = await generateStructured(
      continuityCritic,
      [FIX_INCONSISTENCIES_SCAN_INSTRUCTIONS, ...jobs.map(job => job.prompt)].join(
        FIX_INCONSISTENCIES_PROMPT_JOIN
      ),
      ContinuityScanReportSchema
    )
    const findings = report?.findings ?? []
    return {
      success: true,
      message:
        findings.length === 0
          ? SectionAlignmentCopy.NoFindings
          : `${SectionAlignmentCopy.FindingsPrefix}${findings.length}${SectionAlignmentCopy.FindingsSuffix}`,
      findings,
    }
  },
})
