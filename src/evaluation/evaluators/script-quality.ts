/**
 * Script Quality Evaluator
 *
 * Evaluates the quality of generated scripts using LLM-as-judge:
 * - Dialogue quality and character voice
 * - Format compliance (screenplay format)
 * - Visual storytelling
 * - Pacing and structure
 */

import { ChatOpenAI } from '@langchain/openai'
import { CustomEvaluator, EvaluatorInput, EvaluatorResult } from '../types'

const SCRIPT_QUALITY_PROMPT = `You are a professional script reader and editor. Evaluate the following script content.

## Evaluation Criteria

### 1. DIALOGUE QUALITY (25%)
- Natural, character-specific voices
- Subtext present (what's said vs. what's meant)
- Each line advances plot OR reveals character
- No "on the nose" exposition

### 2. FORMAT COMPLIANCE (25%)
- Scene headings: INT./EXT. LOCATION - DAY/NIGHT
- Character names: ALL CAPS before dialogue
- Action lines: Present tense, no "we see"
- Parentheticals: Used sparingly

### 3. VISUAL STORYTELLING (25%)
- Compelling scene openings
- Specific, visual action lines
- Directorial-friendly descriptions

### 4. PACING (25%)
- Scene length appropriate to dramatic weight
- No redundant lines or actions
- Tension builds appropriately

## SCRIPT CONTENT
{script}

## Instructions
Score each category 0-100, then provide overall score.

Respond with ONLY valid JSON:
{
  "overallScore": 75,
  "dialogueScore": 80,
  "formatScore": 70,
  "visualScore": 75,
  "pacingScore": 75,
  "reasoning": "Brief overall assessment",
  "strengths": ["list", "of", "strengths"],
  "improvements": ["list", "of", "suggested", "improvements"]
}`

export const scriptQualityEvaluator: CustomEvaluator = {
  name: 'script-quality',

  evaluate: async ({ output }: EvaluatorInput): Promise<EvaluatorResult> => {
    const outputStr = typeof output === 'string' ? output : JSON.stringify(output)

    // Check if this looks like script content
    const hasScriptIndicators =
      /INT\.|EXT\./i.test(outputStr) ||
      /FADE (IN|OUT)/i.test(outputStr) ||
      /\n[A-Z]{2,}\n/m.test(outputStr) // Character names in caps

    if (!hasScriptIndicators) {
      return {
        score: 1.0,
        reasoning: 'Output does not appear to be a script - skipping quality evaluation',
        metadata: { skipped: true, reason: 'not_a_script' },
      }
    }

    try {
      const model = new ChatOpenAI({
        modelName: 'gpt-4o-mini',
        temperature: 0,
      })

      const prompt = SCRIPT_QUALITY_PROMPT.replace('{script}', outputStr.slice(0, 8000))

      const response = await model.invoke(prompt)
      const content =
        typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('Failed to parse judge response as JSON')
      }

      const parsed = JSON.parse(jsonMatch[0])

      // Normalize score to 0-1 range
      const normalizedScore = parsed.overallScore / 100

      return {
        score: Math.max(0, Math.min(1, normalizedScore)),
        reasoning: parsed.reasoning,
        metadata: {
          overallScore: parsed.overallScore,
          dialogueScore: parsed.dialogueScore,
          formatScore: parsed.formatScore,
          visualScore: parsed.visualScore,
          pacingScore: parsed.pacingScore,
          strengths: parsed.strengths,
          improvements: parsed.improvements,
        },
      }
    } catch (error) {
      console.error('Script quality evaluation error:', error)
      return {
        score: 0.5,
        reasoning: `Evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { error: true },
      }
    }
  },
}

/**
 * Heuristic script format checker (no LLM required)
 */
export const scriptFormatEvaluator: CustomEvaluator = {
  name: 'script-format',

  evaluate: async ({ output }: EvaluatorInput): Promise<EvaluatorResult> => {
    const outputStr = typeof output === 'string' ? output : JSON.stringify(output)

    const checks = {
      hasSceneHeading: /^(INT\.|EXT\.)/im.test(outputStr),
      hasTimeOfDay: /(- DAY|- NIGHT|- CONTINUOUS|- LATER)/i.test(outputStr),
      hasCharacterCues: /\n[A-Z]{2,}[A-Z ]+\n/m.test(outputStr),
      hasDialogue: /"[^"]+"|'[^']+'/.test(outputStr) || /\n\s{15,}[A-Za-z]/.test(outputStr),
      noWeSee: !/we see/i.test(outputStr),
      noCameraDirections: !/(CLOSE UP|WIDE SHOT|PAN TO|ZOOM|CUT TO:)/i.test(outputStr),
      presentTense: !/\b(walked|said|looked|went)\b/i.test(outputStr.slice(0, 1000)),
    }

    const passedChecks = Object.values(checks).filter(Boolean).length
    const totalChecks = Object.keys(checks).length
    const score = passedChecks / totalChecks

    const failedChecks = Object.entries(checks)
      .filter(([, passed]) => !passed)
      .map(([name]) => name)

    return {
      score,
      reasoning:
        failedChecks.length > 0
          ? `Format issues: ${failedChecks.join(', ')}`
          : 'Script format looks correct',
      metadata: {
        checks,
        passedChecks,
        totalChecks,
        failedChecks,
      },
    }
  },
}
