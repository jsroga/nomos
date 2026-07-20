/**
 * Balance Analyst Agent
 *
 * Evaluates game loop balance by:
 * - Analyzing effort/reward ratios
 * - Identifying dead ends and grind spots
 * - Checking loop integrity
 * - Providing balance recommendations
 */

import { AIMessage } from '@langchain/core/messages'
import { runLoopCreatorCompletion } from './mastra/loop-creator-completion'
import { LoopCreatorMastraAgentId } from './mastra/loop-creator-mastra-agents'
import {
  readNumber,
  readRowString,
  readString,
  recordArrayFromJson,
  recordFromJson,
  stringArrayFromJson,
} from '@/shared/data/json-guards'
import {
  LoopCreatorState,
  BalanceAnalysis,
  BalanceIssue,
  LoopAgentAction,
} from '../../core/graph/state'

const BALANCE_ANALYST_SYSTEM_PROMPT = `You are a Game Balance Analyst - an expert in analyzing and optimizing game loop balance.

## Your Expertise
- Effort/reward ratio analysis
- Loop flow and dead end detection
- Grind pattern identification
- Player motivation dynamics

## Your Task
{{TASK}}

## Current Game Context
Genre: {{GENRE}}
Platform: {{PLATFORM}}
Target Audience: {{AUDIENCE}}
Description: {{DESCRIPTION}}

## Current Mechanics
{{MECHANICS}}

## Current Loops
{{LOOPS}}

## Analysis Guidelines
1. **Effort vs Reward**: Effort should be proportional to reward
2. **Loop Integrity**: Every loop should close - outputs feed back to inputs
3. **Dead Ends**: Flag mechanics that don't connect to anything
4. **Grind Detection**: Repetitive high-effort, low-reward patterns
5. **Pacing**: Variety in effort/reward across the session

## Issue Severity
- **critical**: Breaks core gameplay, must be fixed
- **warning**: Significant but playable, should be addressed
- **suggestion**: Nice to have improvements

## Issue Types
- **reward_imbalance**: Reward doesn't match effort
- **effort_mismatch**: Effort required is inconsistent
- **loop_break**: Loop doesn't properly close
- **dead_end**: Mechanic leads nowhere
- **grind_detected**: Excessive repetition required

## Response Format
Respond with JSON:
{
  "analysis": "Your detailed analysis",
  "overallScore": 7,
  "issues": [
    {
      "severity": "warning",
      "type": "reward_imbalance",
      "description": "What's wrong",
      "affectedMechanics": ["mechanic-ids"],
      "suggestedFix": "How to fix it"
    }
  ],
  "recommendations": ["General recommendations"],
  "message": "Summary for the user"
}`

/**
 * Build context for the agent
 */
function buildContext(state: LoopCreatorState): string {
  const mechanicsList =
    state.mechanics.length > 0
      ? state.mechanics
          .map(m => {
            const bf = m.balanceFactors || { effort: 5, reward: 5, frequency: 5 }
            return `- ${m.name} (${m.type}): Effort=${bf.effort ?? 5}, Reward=${bf.reward ?? 5}, Freq=${bf.frequency ?? 5}`
          })
          .join('\n')
      : 'No mechanics to analyze'

  const loopsList =
    state.loops.length > 0
      ? state.loops
          .map(
            l =>
              `- ${l.name} (${l.type}): ${l.mechanics.length} mechanics, ${l.duration.typical}min cycle`
          )
          .join('\n')
      : 'No loops defined'

  return BALANCE_ANALYST_SYSTEM_PROMPT.replace('{{GENRE}}', state.gameGenre || 'Not specified')
    .replace('{{PLATFORM}}', state.gamePlatform || 'Not specified')
    .replace('{{AUDIENCE}}', state.targetAudience || 'Not specified')
    .replace('{{DESCRIPTION}}', state.gameDescription || 'Not specified')
    .replace('{{MECHANICS}}', mechanicsList)
    .replace('{{LOOPS}}', loopsList)
}

/**
 * Parse agent response
 */
interface BalanceAnalystResponse {
  analysis: string
  overallScore: number
  issues: BalanceIssue[]
  recommendations: string[]
  message: string
}

function readBalanceSeverity(value: unknown): BalanceIssue['severity'] {
  const raw = readString(value)
  if (raw === 'critical' || raw === 'warning' || raw === 'suggestion') return raw
  return 'warning'
}

function readBalanceIssueType(value: unknown): BalanceIssue['type'] {
  const raw = readString(value)
  if (
    raw === 'reward_imbalance' ||
    raw === 'effort_mismatch' ||
    raw === 'loop_break' ||
    raw === 'dead_end' ||
    raw === 'grind_detected'
  ) {
    return raw
  }
  return 'reward_imbalance'
}

function parseBalanceIssue(raw: unknown): BalanceIssue {
  const issue = recordFromJson(raw)
  return {
    severity: readBalanceSeverity(issue.severity),
    type: readBalanceIssueType(issue.type),
    description: readRowString(issue, 'description') ?? '',
    affectedMechanics: stringArrayFromJson(issue.affectedMechanics),
    suggestedFix: readRowString(issue, 'suggestedFix'),
  }
}

function parseResponse(content: string): BalanceAnalystResponse {
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      const parsed = recordFromJson(JSON.parse(jsonMatch[0]))
      const issuesRaw = recordArrayFromJson(parsed.issues)
      return {
        analysis: readRowString(parsed, 'analysis') ?? '',
        overallScore: Math.min(10, Math.max(1, readNumber(parsed.overallScore) ?? 5)),
        issues: issuesRaw.map(parseBalanceIssue),
        recommendations: stringArrayFromJson(parsed.recommendations),
        message: readRowString(parsed, 'message') ?? '',
      }
    } catch {
      // Fall through
    }
  }

  return {
    analysis: content,
    overallScore: 5,
    issues: [],
    recommendations: [],
    message: content,
  }
}

/**
 * Main balance analyst agent function
 */
export async function balanceAnalystAgent(
  state: LoopCreatorState
): Promise<Partial<LoopCreatorState>> {
  // Check if there's anything to analyze
  if (state.mechanics.length === 0) {
    return {
      nextAgent: 'supervisor',
      messages: [
        new AIMessage({
          content: 'No mechanics to analyze yet. Please design some mechanics first.',
          name: 'balance_analyst',
        }),
      ],
    }
  }

  // Get the task
  const lastHumanMsg = [...state.messages].reverse().find(m => m._getType() === 'human')
  const task = lastHumanMsg
    ? typeof lastHumanMsg.content === 'string'
      ? lastHumanMsg.content
      : 'Analyze balance'
    : 'Analyze the current game loop design for balance issues'

  const systemPrompt = buildContext(state).replace('{{TASK}}', task)

  const content = await runLoopCreatorCompletion({
    agentId: LoopCreatorMastraAgentId.BalanceAnalyst,
    systemPrompt,
    history: state.messages.slice(-5),
    temperature: state.modelConfig?.temperature ?? 0.3,
    modelOverride: state.modelConfig?.model,
  })

  const parsed = parseResponse(content)

  console.log(`[BalanceAnalyst] Score: ${parsed.overallScore}/10, Issues: ${parsed.issues.length}`)

  // Create balance analysis
  const balanceAnalysis: BalanceAnalysis = {
    overallScore: parsed.overallScore,
    issues: parsed.issues,
    recommendations: parsed.recommendations,
  }

  // Create action for the analysis
  const actions: LoopAgentAction[] = [
    {
      type: 'SET_BALANCE_ANALYSIS',
      payload: {
        overallScore: balanceAnalysis.overallScore,
        issues: balanceAnalysis.issues,
        recommendations: balanceAnalysis.recommendations,
      },
      confidence: 0.9,
      reasoning: parsed.analysis,
    },
  ]

  // Build user message
  let userMessage = parsed.message || `Balance Analysis Complete: ${parsed.overallScore}/10`

  if (parsed.issues.length > 0) {
    const critical = parsed.issues.filter(i => i.severity === 'critical')
    const warnings = parsed.issues.filter(i => i.severity === 'warning')

    if (critical.length > 0) {
      userMessage += `\n\n🚨 **Critical Issues (${critical.length})**:\n`
      critical.forEach(i => {
        userMessage += `- ${i.description}\n`
        if (i.suggestedFix) userMessage += `  → Fix: ${i.suggestedFix}\n`
      })
    }

    if (warnings.length > 0) {
      userMessage += `\n\n⚠️ **Warnings (${warnings.length})**:\n`
      warnings.forEach(i => {
        userMessage += `- ${i.description}\n`
      })
    }
  }

  return {
    balanceAnalysis,
    pendingActions: actions,
    nextAgent: 'supervisor',
    messages: [
      new AIMessage({
        content: userMessage,
        name: 'balance_analyst',
      }),
    ],
  }
}
