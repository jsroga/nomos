/**
 * Consistency Judge
 *
 * Evaluates story consistency across multiple dimensions:
 * - Fact consistency (things that have been established)
 * - Character consistency (voice, motivation, knowledge, abilities)
 * - World logic (rules of the world)
 * - Timeline (sequence of events)
 *
 * This is crucial for long-form storytelling where AI often "forgets"
 * established facts or contradicts itself.
 */

import { z } from 'zod'
import { BaseLangfuseJudge, buildContextSection } from '../base-langfuse-judge'
import { ConsistencySchema, ConsistencyOutput, ScoreNames, StorytellerContext } from '../types'
import { langfuse, recordCreativeEvaluation } from '@/agent-core/observability'

export class StoryConsistencyJudge extends BaseLangfuseJudge<ConsistencyOutput> {
  name = 'StoryConsistencyJudge'
  scoreName = ScoreNames.STORY_CONSISTENCY

  protected getOutputSchema(): z.ZodType<ConsistencyOutput> {
    return ConsistencySchema
  }

  protected extractScore(parsed: ConsistencyOutput): number {
    return parsed.overallConsistency
  }

  protected extractReasoning(parsed: ConsistencyOutput): string {
    const totalViolations =
      parsed.factViolations.length +
      parsed.characterViolations.length +
      parsed.worldViolations.length +
      parsed.timelineViolations.length

    const criticalCount = [
      ...parsed.factViolations,
      ...parsed.characterViolations,
      ...parsed.worldViolations,
      ...parsed.timelineViolations,
    ].filter(v => v.severity === 'critical').length

    if (totalViolations === 0) {
      return `${parsed.critique} No consistency violations found.`
    }

    return `${parsed.critique} Found ${totalViolations} violation(s)${criticalCount > 0 ? ` (${criticalCount} critical)` : ''}.`
  }

  protected buildPrompt(
    input: string,
    output: string,
    context?: StorytellerContext,
    expected?: string
  ): string {
    const contextSection = buildContextSection(context)

    // Build facts list from context
    const factsSection = context?.establishedFacts?.length
      ? `\nESTABLISHED FACTS TO CHECK:\n${context.establishedFacts.map((f, i) => `${i + 1}. ${f}`).join('\n')}`
      : ''

    // Build character rules
    const characterSection = context?.characters?.length
      ? `\nCHARACTER CONSISTENCY RULES:\n${context.characters.map(c => {
          const rules = []
          if (c.voice) rules.push(`Voice: ${c.voice}`)
          if (c.motivation) rules.push(`Motivation: ${c.motivation}`)
          if (c.currentState) rules.push(`Current State: ${c.currentState}`)
          return `${c.name}:\n  ${rules.join('\n  ')}`
        }).join('\n')}`
      : ''

    // Build world rules
    const worldSection = context?.seriesBible?.worldRules?.length
      ? `\nWORLD RULES TO CHECK:\n${context.seriesBible.worldRules.map((r, i) => `${i + 1}. ${r}`).join('\n')}`
      : ''

    return `You are evaluating creative writing for CONSISTENCY - the faithful adherence to established facts, character traits, world rules, and timeline.

Consistency is critical for:
- Reader trust (breaking consistency breaks immersion)
- Character believability (people don't randomly change)
- World coherence (rules must be followed or acknowledged when broken)
- Narrative logic (cause and effect must track)

CONSISTENCY CATEGORIES:

1. FACT CONSISTENCY
   Check: Does the content contradict any established facts?
   Examples:
   - Character said to be dead appears alive
   - Location described as coastal is now inland
   - Event said to happen on Monday now on Friday
   Severity: Minor (detail), Moderate (noticeable), Critical (plot-breaking)

2. CHARACTER CONSISTENCY
   Check: Does each character behave consistently with their established traits?
   Aspects:
   - VOICE: Do they speak like themselves?
   - MOTIVATION: Do their actions align with their goals?
   - KNOWLEDGE: Do they know only what they should know?
   - ABILITY: Do they only do what they're capable of?
   - RELATIONSHIP: Do they treat others consistently?
   Severity: Minor (slight off), Moderate (out of character), Critical (complete contradiction)

3. WORLD LOGIC
   Check: Does the content follow the established rules of the world?
   Examples:
   - Magic system rules violated
   - Technology that shouldn't exist
   - Social norms contradicted without explanation
   Severity: Minor (technical), Moderate (breaks verisimilitude), Critical (breaks world)

4. TIMELINE
   Check: Does the sequence of events make sense?
   Examples:
   - Events in wrong order
   - Impossible timing (traveled 100 miles in an hour on foot)
   - Character in two places at once
   Severity: Minor (slightly off), Moderate (confusing), Critical (impossible)

${contextSection}
${factsSection}
${characterSection}
${worldSection}

CONTENT TO EVALUATE:
${output}

For each potential violation:
1. Identify the specific inconsistency
2. Reference the established fact/rule being violated
3. Rate severity
4. Note location if applicable

Score each dimension (0-100):
- factConsistency: How well does it match established facts?
- characterConsistency: How true to character is everyone?
- worldConsistency: How well does it follow world rules?
- timelineConsistency: Does the timeline make sense?

A score of 90+ means excellent consistency, maybe one minor issue.
A score of 70-90 has some issues but nothing breaking.
A score of 50-70 has notable problems.
Below 50 has critical consistency failures.

Respond with JSON:
{
  "factViolations": [
    {"fact": "<what was established>", "violation": "<how it's violated>", "severity": "minor" | "moderate" | "critical", "location": "<where in text>"}
  ],
  "characterViolations": [
    {"character": "<name>", "aspect": "voice" | "motivation" | "knowledge" | "ability" | "relationship", "violation": "<description>", "severity": "minor" | "moderate" | "critical"}
  ],
  "worldViolations": [
    {"rule": "<world rule>", "violation": "<how broken>", "severity": "minor" | "moderate" | "critical"}
  ],
  "timelineViolations": [
    {"issue": "<timeline problem>", "severity": "minor" | "moderate" | "critical"}
  ],
  "factConsistency": <0-100>,
  "characterConsistency": <0-100>,
  "worldConsistency": <0-100>,
  "timelineConsistency": <0-100>,
  "overallConsistency": <0-100>,
  "critique": "<summary of consistency analysis>"
}`
  }

  protected calculateConfidence(parsed: ConsistencyOutput): number {
    // Higher confidence if context was provided
    const hasViolations =
      parsed.factViolations.length > 0 ||
      parsed.characterViolations.length > 0

    if (hasViolations) return 0.85
    return 0.7 // Lower confidence when no violations found (might have missed)
  }

  /**
   * Record all consistency sub-dimension scores to Langfuse
   * Per scientific evaluation guide dimensions:
   * - factConsistency, characterConsistency, worldConsistency, timelineConsistency
   */
  protected recordSubScores(traceId: string, parsed: ConsistencyOutput): void {
    recordCreativeEvaluation(traceId, {
      consistency: {
        overall: parsed.overallConsistency,
        factConsistency: parsed.factConsistency,
        characterConsistency: parsed.characterConsistency,
        worldConsistency: parsed.worldConsistency,
        timelineConsistency: parsed.timelineConsistency,
      },
    }, parsed.critique)
    
    // Also record violation counts as categorical scores
    const totalViolations = 
      parsed.factViolations.length +
      parsed.characterViolations.length +
      parsed.worldViolations.length +
      parsed.timelineViolations.length
    
    langfuse.score({
      traceId,
      name: 'has_consistency_violations',
      value: totalViolations > 0 ? 1 : 0,
      dataType: 'BOOLEAN',
      comment: `${totalViolations} total violations found`,
      id: `${traceId}-has_consistency_violations`,
    })
    
    // Record critical violations specifically
    const criticalViolations = [
      ...parsed.factViolations,
      ...parsed.characterViolations,
      ...parsed.worldViolations,
      ...parsed.timelineViolations,
    ].filter(v => v.severity === 'critical').length
    
    if (criticalViolations > 0) {
      langfuse.score({
        traceId,
        name: 'has_critical_violations',
        value: 1,
        dataType: 'BOOLEAN',
        comment: `${criticalViolations} critical violations`,
        id: `${traceId}-has_critical_violations`,
      })
    }
  }
}

/**
 * Specialized judge for character voice consistency
 */
export class CharacterVoiceJudge extends BaseLangfuseJudge<{
  voiceScores: Record<string, number>
  voiceIssues: Array<{
    character: string
    dialogue: string
    issue: string
    suggestion: string
  }>
  overallVoice: number
  critique: string
}> {
  name = 'CharacterVoiceJudge'
  scoreName = ScoreNames.CHARACTER_CONSISTENCY

  protected getOutputSchema() {
    return z.object({
      voiceScores: z.record(z.string(), z.number()),
      voiceIssues: z.array(z.object({
        character: z.string(),
        dialogue: z.string(),
        issue: z.string(),
        suggestion: z.string(),
      })),
      overallVoice: z.number().min(0).max(100),
      critique: z.string(),
    })
  }

  protected extractScore(parsed: any): number {
    return parsed.overallVoice
  }

  protected extractReasoning(parsed: any): string {
    const issueCount = parsed.voiceIssues.length
    return `${parsed.critique} Found ${issueCount} voice issue(s).`
  }

  protected buildPrompt(
    input: string,
    output: string,
    context?: StorytellerContext,
  ): string {
    const characterSection = context?.characters?.length
      ? `\nCHARACTER VOICE PROFILES:\n${context.characters.map(c => {
          return `${c.name} (${c.role}):
  Voice: ${c.voice || 'Not specified'}
  Background: ${c.motivation || 'Unknown'}`
        }).join('\n\n')}`
      : '\nNo character profiles provided - evaluate based on internal consistency.'

    return `You are evaluating dialogue for CHARACTER VOICE CONSISTENCY.

Each character should have a distinct voice based on:
- Education level and vocabulary
- Regional/cultural speech patterns
- Personality (formal/casual, verbose/terse)
- Emotional state
- Relationship to other characters

Signs of GOOD voice consistency:
- Could identify the speaker without dialogue tags
- Vocabulary matches character background
- Speech patterns remain consistent
- Emotional tone fits the situation
- Subtext and what's NOT said fits character

Signs of POOR voice consistency:
- All characters sound the same
- Vocabulary doesn't match character
- Sudden shifts in formality
- Out-of-character reactions
- Generic dialogue anyone could say

${characterSection}

CONTENT TO EVALUATE:
${output}

For each character that speaks:
1. Rate how consistent their voice is
2. Identify any lines that feel off
3. Suggest how to fix off-voice lines

Respond with JSON:
{
  "voiceScores": {"<character name>": <0-100>},
  "voiceIssues": [
    {
      "character": "<name>",
      "dialogue": "<the problematic line>",
      "issue": "<what's wrong>",
      "suggestion": "<how they would really say it>"
    }
  ],
  "overallVoice": <0-100>,
  "critique": "<assessment>"
}`
  }
}

/**
 * Specialized judge for world logic/rules
 */
export class WorldLogicJudge extends BaseLangfuseJudge<{
  ruleAdherence: number
  violations: Array<{
    rule: string
    breach: string
    severity: 'minor' | 'moderate' | 'critical'
    fix: string
  }>
  internalConsistency: number
  critique: string
}> {
  name = 'WorldLogicJudge'
  scoreName = ScoreNames.WORLD_LOGIC

  protected getOutputSchema() {
    return z.object({
      ruleAdherence: z.number().min(0).max(100),
      violations: z.array(z.object({
        rule: z.string(),
        breach: z.string(),
        severity: z.enum(['minor', 'moderate', 'critical']),
        fix: z.string(),
      })),
      internalConsistency: z.number().min(0).max(100),
      critique: z.string(),
    })
  }

  protected extractScore(parsed: any): number {
    return (parsed.ruleAdherence + parsed.internalConsistency) / 2
  }

  protected extractReasoning(parsed: any): string {
    const violationCount = parsed.violations.length
    return `${parsed.critique} Rule adherence: ${parsed.ruleAdherence}%. Found ${violationCount} violation(s).`
  }

  protected buildPrompt(
    input: string,
    output: string,
    context?: StorytellerContext,
  ): string {
    const rulesSection = context?.seriesBible?.worldRules?.length
      ? `\nESTABLISHED WORLD RULES:\n${context.seriesBible.worldRules.map((r, i) => `${i + 1}. ${r}`).join('\n')}`
      : '\nNo explicit world rules provided - evaluate for internal consistency only.'

    return `You are evaluating creative writing for WORLD LOGIC - adherence to established rules and internal consistency.

Every story world has rules, whether explicit or implicit:
- Physical laws (or how they differ from reality)
- Magic/tech systems and their limits
- Social structures and norms
- Economic realities
- What's possible and impossible

Good world logic:
- Rules are followed consistently
- When rules are broken, it's acknowledged/explained
- Limitations create meaningful constraints
- The world feels real and coherent

Bad world logic:
- Rules only apply when convenient
- Characters suddenly have new abilities
- Economics that don't make sense
- Technology/magic that solves everything
- Contradictions between scenes

${rulesSection}

Genre: ${context?.seriesBible?.genre?.join(', ') || 'Not specified'}
Tone: ${context?.seriesBible?.tone || 'Not specified'}

CONTENT TO EVALUATE:
${output}

Analyze for:
1. Adherence to stated rules
2. Internal consistency (even without explicit rules)
3. Verisimilitude within the genre

Respond with JSON:
{
  "ruleAdherence": <0-100>,
  "violations": [
    {"rule": "<rule broken>", "breach": "<how>", "severity": "minor" | "moderate" | "critical", "fix": "<how to fix>"}
  ],
  "internalConsistency": <0-100, does it contradict itself>,
  "critique": "<assessment>"
}`
  }
}

/**
 * Composite judge that runs all consistency checks
 */
export class CompositeConsistencyJudge extends BaseLangfuseJudge<{
  factScore: number
  characterScore: number
  worldScore: number
  timelineScore: number
  overall: number
  summary: string
}> {
  name = 'CompositeConsistencyJudge'
  scoreName = ScoreNames.STORY_CONSISTENCY

  private storyJudge = new StoryConsistencyJudge(this.config)
  private voiceJudge = new CharacterVoiceJudge(this.config)
  private worldJudge = new WorldLogicJudge(this.config)

  protected getOutputSchema() {
    return z.object({
      factScore: z.number().min(0).max(100),
      characterScore: z.number().min(0).max(100),
      worldScore: z.number().min(0).max(100),
      timelineScore: z.number().min(0).max(100),
      overall: z.number().min(0).max(100),
      summary: z.string(),
    })
  }

  protected extractScore(parsed: any): number {
    return parsed.overall
  }

  protected extractReasoning(parsed: any): string {
    return parsed.summary
  }

  protected buildPrompt(): string {
    // Not used - we override evaluate()
    return ''
  }

  async evaluate(
    input: string,
    output: string,
    context?: StorytellerContext,
    expected?: string
  ) {
    // Run all sub-judges in parallel
    const [storyResult, voiceResult, worldResult] = await Promise.all([
      this.storyJudge.evaluate(input, output, context, expected),
      this.voiceJudge.evaluate(input, output, context, expected),
      this.worldJudge.evaluate(input, output, context, expected),
    ])

    const storyDetails = storyResult.details as ConsistencyOutput
    const voiceDetails = voiceResult.details
    const worldDetails = worldResult.details

    // Combine scores (weighted average)
    const factScore = storyDetails.factConsistency || 80
    const characterScore = (storyDetails.characterConsistency || 80 + (voiceDetails?.overallVoice || 80)) / 2
    const worldScore = worldDetails?.ruleAdherence || storyDetails.worldConsistency || 80
    const timelineScore = storyDetails.timelineConsistency || 90

    const overall = (factScore * 0.3 + characterScore * 0.3 + worldScore * 0.2 + timelineScore * 0.2)

    const details = {
      factScore,
      characterScore,
      worldScore,
      timelineScore,
      overall,
      summary: `Fact: ${factScore.toFixed(0)}%, Character: ${characterScore.toFixed(0)}%, World: ${worldScore.toFixed(0)}%, Timeline: ${timelineScore.toFixed(0)}%`,
    }

    return {
      score: this.normalizeScore(overall),
      scoreName: this.scoreName,
      reasoning: details.summary,
      confidence: Math.min(storyResult.confidence, voiceResult.confidence, worldResult.confidence),
      details,
    }
  }
}
