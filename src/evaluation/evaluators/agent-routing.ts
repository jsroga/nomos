/**
 * Agent Routing Evaluator
 * 
 * Evaluates whether the supervisor/orchestrator makes correct routing decisions:
 * - Delegation to appropriate agents
 * - Phase-appropriate actions
 * - Halting/continuing decisions
 */

import { CustomEvaluator, EvaluatorInput, EvaluatorResult } from '../types'

// Agent routing rules based on input patterns
const ROUTING_RULES: Array<{
  patterns: RegExp[]
  expectedAgents: string[]
  category: string
}> = [
  // Delegation commands
  {
    patterns: [/\bstart\b/i, /\blet'?s\s+(begin|go|do|work)/i, /\bproceed\b/i],
    expectedAgents: ['PremiseArchitect', 'PlotArchitect', 'Showrunner'],
    category: 'delegation',
  },
  // Writing commands
  {
    patterns: [/\bwrite\b/i, /\bscript\b/i, /\bdialogue\b/i, /\bwriting phase\b/i],
    expectedAgents: ['Writer', 'ScriptEditor'],
    category: 'writing',
  },
  // Character work
  {
    patterns: [/\bcharacter\b/i, /\bmotivation\b/i, /\bpsychology\b/i, /\barc\b/i],
    expectedAgents: ['CharacterPsychology', 'Character', 'PlotArchitect'],
    category: 'character',
  },
  // Plot/structure work
  {
    patterns: [/\bbeat\b/i, /\bplot\b/i, /\bstructure\b/i, /\bact\b/i],
    expectedAgents: ['PlotArchitect', 'Showrunner'],
    category: 'plot',
  },
  // Premise work
  {
    patterns: [/\bpremise\b/i, /\bworld\b/i, /\bsetting\b/i, /\brules?\b/i],
    expectedAgents: ['PremiseArchitect', 'EpisodePremiseArchitect'],
    category: 'premise',
  },
  // Review/critique
  {
    patterns: [/\breview\b/i, /\bcritique\b/i, /\bcheck\b/i, /\bverify\b/i],
    expectedAgents: ['DevilsAdvocate', 'ScriptEditor', 'ConsequenceTracker'],
    category: 'review',
  },
]

// Commands that should halt and wait for user input
const SHOULD_HALT_PATTERNS = [
  /\bwhat do you think\b/i,
  /\byour opinion\b/i,
  /\bshould (we|i)\b/i,
  /\bwhy did you\b/i,
  /\bexplain\b/i,
  /\?\s*$/,  // Questions ending with ?
]

// Commands that should NOT halt
const SHOULD_NOT_HALT_PATTERNS = [
  /\bstart\b/i,
  /\bgo\b/i,
  /\bproceed\b/i,
  /\bmake\s+(changes?|it|this)/i,
  /\bfix\b/i,
  /\bapproved?\b/i,
  /\blooks? good\b/i,
]

export const agentRoutingEvaluator: CustomEvaluator = {
  name: 'agent-routing',

  evaluate: async ({ input, output, reference }: EvaluatorInput): Promise<EvaluatorResult> => {
    const inputStr = typeof input === 'object' && 'message' in input
      ? String(input.message)
      : JSON.stringify(input)
    
    const outputStr = typeof output === 'string' ? output : JSON.stringify(output)

    const expected = reference as {
      expectedAgents?: string[]
      shouldNotHalt?: boolean
      shouldHalt?: boolean
    } | undefined

    const issues: string[] = []
    let score = 1.0

    // 1. Check halting behavior
    const shouldHalt = SHOULD_HALT_PATTERNS.some((p) => p.test(inputStr))
    const shouldNotHalt = SHOULD_NOT_HALT_PATTERNS.some((p) => p.test(inputStr))
    
    const outputHalted =
      /awaiting[_\s]*(user[_\s]*)?input/i.test(outputStr) ||
      /waiting for/i.test(outputStr)

    // Override with explicit expectations if provided
    const expectedHalt = expected?.shouldHalt ?? (shouldHalt && !shouldNotHalt)
    const expectedNoHalt = expected?.shouldNotHalt ?? shouldNotHalt

    if (expectedNoHalt && outputHalted) {
      issues.push('Halted when should have proceeded')
      score -= 0.3
    }

    if (expectedHalt && !outputHalted) {
      issues.push('Did not halt when user asked a question')
      score -= 0.2
    }

    // 2. Check delegation to correct agents
    const delegatedAgents: string[] = []
    const agentPatterns = [
      /delegating to (\w+)/gi,
      /(\w+Architect)/gi,
      /(Writer|ScriptEditor|Showrunner)/gi,
      /(Character\w*)/gi,
      /(DevilsAdvocate|ConsequenceTracker)/gi,
    ]

    for (const pattern of agentPatterns) {
      let match
      while ((match = pattern.exec(outputStr)) !== null) {
        if (match[1]) {
          delegatedAgents.push(match[1])
        }
      }
    }

    // Check against expected agents
    if (expected?.expectedAgents && expected.expectedAgents.length > 0) {
      const foundExpected = expected.expectedAgents.filter((agent) =>
        delegatedAgents.some((d) => d.toLowerCase().includes(agent.toLowerCase()))
      )

      if (foundExpected.length === 0) {
        issues.push(
          `Expected delegation to [${expected.expectedAgents.join(', ')}] but found [${delegatedAgents.join(', ')}]`
        )
        score -= 0.4
      } else if (foundExpected.length < expected.expectedAgents.length) {
        issues.push(
          `Partial delegation match: expected ${expected.expectedAgents.length}, found ${foundExpected.length}`
        )
        score -= 0.2
      }
    } else {
      // Infer expected agents from input patterns
      for (const rule of ROUTING_RULES) {
        const matchesRule = rule.patterns.some((p) => p.test(inputStr))
        if (matchesRule) {
          const foundMatch = rule.expectedAgents.some((agent) =>
            delegatedAgents.some((d) => d.toLowerCase().includes(agent.toLowerCase()))
          )
          if (!foundMatch && delegatedAgents.length > 0) {
            issues.push(
              `For ${rule.category} input, expected agents like [${rule.expectedAgents.join(', ')}]`
            )
            score -= 0.15
          }
          break // Only check first matching rule
        }
      }
    }

    score = Math.max(0, Math.min(1, score))

    return {
      score,
      reasoning:
        issues.length > 0
          ? `Routing issues: ${issues.join('; ')}`
          : 'Routing decisions appear correct',
      metadata: {
        inputMessage: inputStr.slice(0, 100),
        delegatedAgents: Array.from(new Set(delegatedAgents)),
        halted: outputHalted,
        issues,
      },
    }
  },
}

/**
 * Simplified version checking only halting behavior
 */
export const haltingBehaviorEvaluator: CustomEvaluator = {
  name: 'halting-behavior',

  evaluate: async ({ input, output, reference }: EvaluatorInput): Promise<EvaluatorResult> => {
    const inputStr = typeof input === 'object' && 'message' in input
      ? String(input.message)
      : JSON.stringify(input)
    
    const outputStr = typeof output === 'string' ? output : JSON.stringify(output)

    const expected = reference as {
      shouldNotHalt?: boolean
      shouldHalt?: boolean
    } | undefined

    const outputHalted = /awaiting[_\s]*(user[_\s]*)?input/i.test(outputStr)

    if (expected?.shouldNotHalt && outputHalted) {
      return {
        score: 0,
        reasoning: 'Agent halted when it should have proceeded',
        metadata: { input: inputStr.slice(0, 100), halted: true },
      }
    }

    if (expected?.shouldHalt && !outputHalted) {
      return {
        score: 0,
        reasoning: 'Agent proceeded when it should have halted',
        metadata: { input: inputStr.slice(0, 100), halted: false },
      }
    }

    return {
      score: 1.0,
      reasoning: 'Halting behavior correct',
      metadata: { input: inputStr.slice(0, 100), halted: outputHalted },
    }
  },
}

