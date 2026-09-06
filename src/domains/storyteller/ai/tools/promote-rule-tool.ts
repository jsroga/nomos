import '@/shared/data/server-guard'
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import {
  STORYTELLER_PROJECT_ID,
  requestContextString,
} from '@/domains/storyteller/ai/request-context'
import { BibleToolError } from './bible-tools-update'
import {
  PROMOTE_RULE_TOOL_DESC,
  PROMOTE_RULE_TOOL_ID,
} from './manage-tools-wire'
import {
  persistPromotedProjectRule,
  revokePromotedProjectRule,
} from '@/domains/storyteller/core/io/promote-project-rule'
import { PromotedRuleCopy } from '@/domains/storyteller/core/promote-rule/promoted-rule'

export enum PromoteRuleOperation {
  Promote = 'promote',
  Revoke = 'revoke',
}

enum PromoteRuleCopy {
  Ok = 'Project rule updated.',
  RuleTextRequired = 'ruleText is required to promote',
  RuleNameRequired = 'ruleName is required to revoke',
}

const PromoteRuleInputSchema = z.object({
  operation: z.nativeEnum(PromoteRuleOperation),
  ruleText: z.string().optional(),
  quote: z.string().optional(),
  ruleName: z.string().optional(),
})

const PromoteRuleOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  ruleName: z.string().optional(),
})

export const promoteRuleTool = createTool({
  id: PROMOTE_RULE_TOOL_ID,
  description: PROMOTE_RULE_TOOL_DESC,
  inputSchema: PromoteRuleInputSchema,
  outputSchema: PromoteRuleOutputSchema,
  execute: async (inputData, context) => {
    const projectId = requestContextString(context.requestContext, STORYTELLER_PROJECT_ID)
    if (!projectId) {
      return { success: false, message: BibleToolError.ProjectIdRequired }
    }
    if (inputData.operation === PromoteRuleOperation.Revoke) {
      const ruleName = inputData.ruleName?.trim() ?? ''
      if (ruleName.length === 0) {
        return { success: false, message: PromoteRuleCopy.RuleNameRequired }
      }
      await revokePromotedProjectRule({ projectId, ruleName })
      return { success: true, message: PromoteRuleCopy.Ok, ruleName }
    }
    const ruleText = inputData.ruleText?.trim() ?? ''
    if (ruleText.length === 0) {
      return { success: false, message: PromoteRuleCopy.RuleTextRequired }
    }
    const saved = await persistPromotedProjectRule({
      projectId,
      ruleText,
      quote: inputData.quote?.trim() || PromotedRuleCopy.DefaultQuote,
    })
    return { success: true, message: PromoteRuleCopy.Ok, ruleName: saved.name }
  },
})
