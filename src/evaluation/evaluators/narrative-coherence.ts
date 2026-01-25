/**
 * Narrative Coherence Evaluator
 *
 * Evaluates story-level quality beyond line-level checks:
 * - Plot progression logic
 * - Character arc consistency
 * - Thematic coherence
 * - Setup/payoff tracking (Chekhov's Gun)
 * - Pacing quality
 *
 * Uses Claude Opus 4.5 for sophisticated narrative analysis.
 */

import { ChatAnthropic } from '@langchain/anthropic'
import { CustomEvaluator, EvaluatorInput, EvaluatorResult } from '../types'

const NARRATIVE_COHERENCE_PROMPT = `You are a master story analyst with deep expertise in narrative structure, dramatic theory, and the craft of prestige television writing. You've studied under Robert McKee, Dan Harmon, and the HBO school of complex storytelling.

## Your Mission
Evaluate the NARRATIVE COHERENCE of this content - not just consistency, but whether it works as STORYTELLING.

## Evaluation Dimensions (Score 0-100 each)

### 1. PLOT PROGRESSION LOGIC (Weight: 25%)
- Does each scene/beat CAUSE the next?
- Is there rising action, or just events happening?
- Do obstacles create genuine conflict or just padding?
- Is there a clear sense of stakes escalating?

George R.R. Martin Standard: "Every scene should be a fight - even at dinner."

### 2. CHARACTER ARC COHERENCE (Weight: 25%)
- Are character decisions driven by their established psychology?
- Do characters CHANGE in response to events?
- Is the change earned, not forced?
- Can you track the "want vs need" through the narrative?

GRRM Standard: "Characters should be changed by events, not just present for them."

### 3. THEMATIC COHERENCE (Weight: 15%)
- Is there an identifiable theme being explored?
- Do subplots reinforce the theme?
- Is the theme explored through action, not exposition?
- Are there multiple perspectives on the central theme?

GRRM Standard: "Theme should emerge from conflict, never be stated outright."

### 4. SETUP/PAYOFF TRACKING (Weight: 20%)
- Are Chekhov's Guns being properly loaded?
- Are established setups being paid off?
- Are payoffs earned and satisfying?
- Are there dangling threads that feel intentional vs forgotten?

GRRM Standard: "Every detail should matter, or seem like it should matter."

### 5. PACING QUALITY (Weight: 15%)
- Is there variation in scene intensity?
- Are quiet moments used effectively for character development?
- Do action sequences have emotional stakes?
- Is the reader/viewer given time to breathe?

GRRM Standard: "Pace is the heartbeat of story - too fast exhausts, too slow bores."

## Content to Analyze
{{content}}

## Context (if available)
{{context}}

## Instructions
Analyze the narrative as if you're a showrunner reviewing a script. Be constructive but honest - we need to know what's working and what needs improvement.

Respond with ONLY valid JSON:
{
  "overallScore": 75,
  "dimensions": {
    "plotProgression": {
      "score": 80,
      "analysis": "Specific analysis with examples",
      "strengths": ["what's working"],
      "weaknesses": ["what needs work"]
    },
    "characterArc": {
      "score": 70,
      "analysis": "Specific analysis",
      "strengths": [],
      "weaknesses": []
    },
    "thematicCoherence": {
      "score": 75,
      "analysis": "Specific analysis",
      "strengths": [],
      "weaknesses": []
    },
    "setupPayoff": {
      "score": 65,
      "analysis": "Specific analysis",
      "activeSetups": ["things that need payoff"],
      "missedPayoffs": ["setups that were dropped"]
    },
    "pacing": {
      "score": 80,
      "analysis": "Specific analysis",
      "strengths": [],
      "weaknesses": []
    }
  },
  "narrativeNotes": {
    "whatsMagical": ["moments that sing"],
    "whatNeedsWork": ["specific improvements needed"],
    "structuralSuggestion": "one key structural change that would improve the whole"
  },
  "seriesLevel": {
    "episodicCoherence": "How well does this fit in the larger story?",
    "serialElements": "What continuing threads are being serviced?"
  }
}`

export const narrativeCoherenceEvaluator: CustomEvaluator = {
  name: 'narrative-coherence',

  evaluate: async ({ output, reference }: EvaluatorInput): Promise<EvaluatorResult> => {
    const content = typeof output === 'string' ? output : JSON.stringify(output, null, 2)

    if (content.length < 200) {
      return {
        score: 0.5,
        reasoning: 'Content too short for meaningful narrative analysis',
        metadata: { skipped: true },
      }
    }

    try {
      const model = new ChatAnthropic({
        modelName: 'claude-opus-4-5-20251101',
        temperature: 0.2, // Slightly creative for nuanced analysis
        maxRetries: 2,
      })

      const context = reference ? JSON.stringify(reference, null, 2) : 'No additional context provided.'

      const prompt = NARRATIVE_COHERENCE_PROMPT
        .replace('{{content}}', content.slice(0, 10000))
        .replace('{{context}}', context.slice(0, 4000))

      const response = await model.invoke(prompt)
      const responseText =
        typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('Failed to parse narrative analysis response')
      }

      const parsed = JSON.parse(jsonMatch[0])

      // Calculate weighted score from dimensions
      const weights = {
        plotProgression: 0.25,
        characterArc: 0.25,
        thematicCoherence: 0.15,
        setupPayoff: 0.2,
        pacing: 0.15,
      }

      let weightedScore = 0
      for (const [key, weight] of Object.entries(weights)) {
        const dimScore = parsed.dimensions?.[key]?.score || 50
        weightedScore += dimScore * weight
      }

      // Use the calculated weighted score if overallScore seems off
      const finalScore = Math.abs(parsed.overallScore - weightedScore) > 10
        ? weightedScore
        : parsed.overallScore

      return {
        score: finalScore / 100,
        reasoning: `Narrative coherence: ${finalScore.toFixed(0)}/100. ${parsed.narrativeNotes?.structuralSuggestion || ''}`,
        metadata: {
          overallScore: finalScore,
          dimensions: parsed.dimensions,
          narrativeNotes: parsed.narrativeNotes,
          seriesLevel: parsed.seriesLevel,
          evaluatedBy: 'claude-opus-4-5-20251101',
        },
      }
    } catch (error) {
      console.error('Narrative coherence evaluation error:', error)
      return {
        score: 0,
        reasoning: `Evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { error: true },
      }
    }
  },
}

/**
 * Quick narrative check - focuses on the most critical elements
 */
export const narrativeQuickCheck: CustomEvaluator = {
  name: 'narrative-quick',

  evaluate: async ({ output }: EvaluatorInput): Promise<EvaluatorResult> => {
    const content = typeof output === 'string' ? output : JSON.stringify(output)

    // Quick heuristic checks
    const issues: string[] = []
    let score = 1.0

    // Check for passive protagonist
    const passiveIndicators = [
      /was told to/gi,
      /was forced to/gi,
      /had no choice/gi,
      /didn't know what to do/gi,
      /decided to wait/gi,
    ]
    const passiveCount = passiveIndicators.reduce((count, pattern) => {
      return count + (content.match(pattern) || []).length
    }, 0)
    if (passiveCount > 2) {
      issues.push('Passive protagonist detected - characters should drive action')
      score -= 0.15
    }

    // Check for "and then" plotting (episodic vs causal)
    const andThenCount = (content.match(/\band then\b/gi) || []).length
    const butThereforeCount =
      (content.match(/\bbut\b/gi) || []).length + (content.match(/\btherefore\b/gi) || []).length
    if (andThenCount > butThereforeCount * 2 && andThenCount > 3) {
      issues.push('Episodic plotting - events should cause each other, not just follow')
      score -= 0.2
    }

    // Check for deus ex machina indicators
    const deusIndicators = [
      /suddenly appeared/gi,
      /out of nowhere/gi,
      /miraculously/gi,
      /by sheer luck/gi,
      /fortunately/gi,
    ]
    const deusCount = deusIndicators.reduce((count, pattern) => {
      return count + (content.match(pattern) || []).length
    }, 0)
    if (deusCount > 1) {
      issues.push('Potential deus ex machina - solutions should be earned')
      score -= 0.15
    }

    // Check for theme-stating (show don't tell for theme)
    const themeStatements = [
      /the moral of/gi,
      /this taught (him|her|them)/gi,
      /learned that life/gi,
      /realized the importance/gi,
    ]
    const themeCount = themeStatements.reduce((count, pattern) => {
      return count + (content.match(pattern) || []).length
    }, 0)
    if (themeCount > 0) {
      issues.push('Theme being stated explicitly - should emerge from action')
      score -= 0.1
    }

    score = Math.max(0, score)

    return {
      score,
      reasoning:
        issues.length > 0
          ? `Narrative issues: ${issues.join('; ')}`
          : 'No obvious narrative coherence issues',
      metadata: {
        issues,
        passiveCount,
        episodicRatio: andThenCount / Math.max(butThereforeCount, 1),
      },
    }
  },
}
