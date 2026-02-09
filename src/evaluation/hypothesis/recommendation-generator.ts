/**
 * Recommendation Generator for Hypothesis Experiments
 *
 * LLM-powered analysis that:
 * 1. Receives hypothesis, scores, and captured outputs
 * 2. Analyzes which metrics improved/regressed
 * 3. Generates specific, actionable recommendations
 * 4. Outputs structured markdown report
 */

import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import * as fs from 'fs/promises'
import * as path from 'path'
import {
  Hypothesis,
  SimulationResult,
  MetricComparison,
  Recommendation,
  RecommendationReport,
} from './types'
import { DeepEvalOutput } from '../deepeval/types'

// ============================================
// Metric Comparison
// ============================================

/**
 * Calculate metric comparisons between baseline and variant
 */
export function calculateMetricComparisons(
  baselineResults: DeepEvalOutput,
  variantResults: DeepEvalOutput
): MetricComparison[] {
  const comparisons: MetricComparison[] = []

  // Get all metrics from baseline
  const baselineMetrics = new Map<string, number>()
  const variantMetrics = new Map<string, number>()

  for (const tc of baselineResults.testCases || []) {
    for (const metric of tc.metrics || []) {
      const currentScore = baselineMetrics.get(metric.name) || 0
      const count = baselineMetrics.has(metric.name) ? 2 : 1
      baselineMetrics.set(metric.name, (currentScore + metric.score) / count)
    }
  }

  for (const tc of variantResults.testCases || []) {
    for (const metric of tc.metrics || []) {
      const currentScore = variantMetrics.get(metric.name) || 0
      const count = variantMetrics.has(metric.name) ? 2 : 1
      variantMetrics.set(metric.name, (currentScore + metric.score) / count)
    }
  }

  // Calculate comparisons
  const allMetricNames = new Set([...baselineMetrics.keys(), ...variantMetrics.keys()])

  for (const metricName of allMetricNames) {
    const baselineScore = baselineMetrics.get(metricName) || 0
    const variantScore = variantMetrics.get(metricName) || 0
    const delta = variantScore - baselineScore
    const deltaPercent = baselineScore > 0 ? (delta / baselineScore) * 100 : 0

    comparisons.push({
      metricName,
      baselineScore,
      variantScore,
      delta,
      deltaPercent,
      improved: delta > 0,
      significant: Math.abs(deltaPercent) > 10, // 10% change is significant
    })
  }

  return comparisons.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
}

/**
 * Determine verdict based on metric comparisons
 */
export function determineVerdict(
  comparisons: MetricComparison[],
  targetMetrics: string[]
): 'confirmed' | 'rejected' | 'inconclusive' {
  // Filter to target metrics only
  const targetComparisons = comparisons.filter(
    c => targetMetrics.length === 0 || targetMetrics.includes(c.metricName)
  )

  if (targetComparisons.length === 0) {
    return 'inconclusive'
  }

  const improved = targetComparisons.filter(c => c.improved && c.significant).length
  const regressed = targetComparisons.filter(c => !c.improved && c.significant).length
  const total = targetComparisons.length

  if (improved > regressed && improved >= total / 2) {
    return 'confirmed'
  } else if (regressed > improved && regressed >= total / 2) {
    return 'rejected'
  }

  return 'inconclusive'
}

// ============================================
// LLM-Powered Recommendation Generation
// ============================================

const RECOMMENDATION_PROMPT = `You are an expert in storytelling AI evaluation and prompt engineering.

Analyze the following hypothesis experiment results and generate actionable recommendations.

## Hypothesis
{hypothesis}

## Metric Comparisons
{comparisons}

## Verdict
{verdict}

## Baseline Output Sample
{baselineOutput}

## Variant Output Sample
{variantOutput}

## Your Task
Generate 3-5 specific, actionable recommendations for improving the storytelling AI based on these results.

For each recommendation:
1. Identify the specific area to improve (prompt, logic, flow, or model)
2. Explain WHY this change would help based on the metrics
3. Provide a concrete suggestion for implementation
4. Reference specific evidence from the outputs if relevant

Also provide 2-3 suggested next steps for follow-up experiments.

Respond in JSON format:
{
  "summary": "One paragraph summary of the findings",
  "recommendations": [
    {
      "priority": "high|medium|low",
      "area": "prompt|logic|flow|model",
      "recommendation": "The specific recommendation",
      "evidence": "Supporting evidence from results",
      "location": "Optional: specific file/location to change"
    }
  ],
  "nextSteps": [
    "Suggested follow-up experiment 1",
    "Suggested follow-up experiment 2"
  ]
}`

/**
 * Generate LLM-powered recommendations
 */
export async function generateRecommendations(
  hypothesis: Hypothesis,
  comparisons: MetricComparison[],
  verdict: 'confirmed' | 'rejected' | 'inconclusive',
  baselineOutput: string,
  variantOutput: string
): Promise<{
  summary: string
  recommendations: Recommendation[]
  nextSteps: string[]
}> {
  const openai = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })

  const prompt = RECOMMENDATION_PROMPT.replace('{hypothesis}', JSON.stringify(hypothesis, null, 2))
    .replace(
      '{comparisons}',
      comparisons
        .map(
          c =>
            `- ${c.metricName}: ${c.baselineScore.toFixed(2)} → ${c.variantScore.toFixed(2)} (${c.deltaPercent > 0 ? '+' : ''}${c.deltaPercent.toFixed(1)}%) ${c.significant ? '⚠️ SIGNIFICANT' : ''}`
        )
        .join('\n')
    )
    .replace('{verdict}', verdict.toUpperCase())
    .replace('{baselineOutput}', baselineOutput.slice(0, 2000))
    .replace('{variantOutput}', variantOutput.slice(0, 2000))

  try {
    const response = await generateText({
      model: openai('gpt-4o-mini'),
      prompt,
      temperature: 0.3,
    })

    // Parse JSON from response
    const jsonMatch = response.text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        summary: parsed.summary || 'No summary generated',
        recommendations: (parsed.recommendations || []).map((r: any) => ({
          priority: r.priority || 'medium',
          area: r.area || 'prompt',
          recommendation: r.recommendation || '',
          evidence: r.evidence || '',
          location: r.location,
        })),
        nextSteps: parsed.nextSteps || [],
      }
    }
  } catch (error) {
    console.error('Failed to generate recommendations:', error)
  }

  // Fallback
  return {
    summary: `Hypothesis ${verdict}. See metric comparisons for details.`,
    recommendations: [],
    nextSteps: ['Review metric results manually', 'Consider additional test cases'],
  }
}

// ============================================
// Report Generation
// ============================================

/**
 * Generate a full recommendation report
 */
export async function generateReport(
  hypothesis: Hypothesis,
  baselineSimulation: SimulationResult,
  variantSimulation: SimulationResult,
  baselineEval: DeepEvalOutput,
  variantEval: DeepEvalOutput
): Promise<RecommendationReport> {
  // Calculate metric comparisons
  const comparisons = calculateMetricComparisons(baselineEval, variantEval)

  // Determine verdict
  const verdict = determineVerdict(comparisons, hypothesis.targetMetrics)

  // Serialize outputs for LLM analysis
  const baselineOutput = JSON.stringify(baselineSimulation.capturedOutputs, null, 2)
  const variantOutput = JSON.stringify(variantSimulation.capturedOutputs, null, 2)

  // Generate LLM recommendations
  const { summary, recommendations, nextSteps } = await generateRecommendations(
    hypothesis,
    comparisons,
    verdict,
    baselineOutput,
    variantOutput
  )

  // Build raw scores
  const baselineScores: Record<string, number> = {}
  const variantScores: Record<string, number> = {}

  for (const comparison of comparisons) {
    baselineScores[comparison.metricName] = comparison.baselineScore
    variantScores[comparison.metricName] = comparison.variantScore
  }

  return {
    hypothesis,
    summary,
    verdict,
    metricsAnalysis: comparisons,
    recommendations,
    nextSteps,
    rawData: {
      baselineScores,
      variantScores,
      baselineSimulation,
      variantSimulation,
    },
    generatedAt: new Date().toISOString(),
  }
}

/**
 * Render report as Markdown
 */
export function renderReportAsMarkdown(report: RecommendationReport): string {
  const { hypothesis, verdict, metricsAnalysis, recommendations, nextSteps, rawData, generatedAt } =
    report

  const verdictEmoji = verdict === 'confirmed' ? '✅' : verdict === 'rejected' ? '❌' : '❓'
  const verdictText =
    verdict === 'confirmed'
      ? 'HYPOTHESIS CONFIRMED - Variant outperformed baseline'
      : verdict === 'rejected'
        ? 'HYPOTHESIS REJECTED - Baseline outperformed variant'
        : 'INCONCLUSIVE - No significant difference detected'

  let md = `# Hypothesis Evaluation Report

## Hypothesis: ${hypothesis.name}
**ID:** ${hypothesis.id}
**Date:** ${new Date(generatedAt).toLocaleDateString()}
**Prediction:** ${hypothesis.prediction}

### Variable Being Tested
- **Type:** ${hypothesis.variable.type}
- **Baseline:** ${typeof hypothesis.variable.baseline === 'string' ? hypothesis.variable.baseline : JSON.stringify(hypothesis.variable.baseline)}
- **Variant:** ${typeof hypothesis.variable.variant === 'string' ? hypothesis.variable.variant : JSON.stringify(hypothesis.variable.variant)}

---

## Results Summary

| Metric | Baseline | Variant | Delta | Significant? |
|--------|----------|---------|-------|--------------|
`

  for (const m of metricsAnalysis) {
    const arrow = m.improved ? '↑' : m.delta < 0 ? '↓' : '→'
    const significant = m.significant ? '⚠️ Yes' : 'No'
    md += `| ${m.metricName} | ${m.baselineScore.toFixed(2)} | ${m.variantScore.toFixed(2)} | ${arrow} ${m.deltaPercent > 0 ? '+' : ''}${m.deltaPercent.toFixed(1)}% | ${significant} |\n`
  }

  md += `
---

## Verdict
${verdictEmoji} **${verdictText}**

${report.summary}

---

## Recommendations
`

  for (let i = 0; i < recommendations.length; i++) {
    const rec = recommendations[i]
    const priorityBadge = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢'
    md += `
### ${i + 1}. ${rec.recommendation}
${priorityBadge} **Priority:** ${rec.priority} | **Area:** ${rec.area}
${rec.location ? `📍 **Location:** \`${rec.location}\`` : ''}

${rec.evidence}
`
  }

  md += `
---

## Next Steps
`
  for (const step of nextSteps) {
    md += `- [ ] ${step}\n`
  }

  md += `
---

## Raw Data

### Baseline Scores
\`\`\`json
${JSON.stringify(rawData.baselineScores, null, 2)}
\`\`\`

### Variant Scores
\`\`\`json
${JSON.stringify(rawData.variantScores, null, 2)}
\`\`\`

---

*Report generated at ${generatedAt}*
`

  return md
}

/**
 * Save report to file
 */
export async function saveReport(
  report: RecommendationReport,
  outputDir: string = path.join(process.cwd(), 'src', 'evaluation', 'hypothesis', 'reports')
): Promise<string> {
  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true })

  // Generate filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const filename = `${timestamp}-${report.hypothesis.id}.md`
  const filepath = path.join(outputDir, filename)

  // Render and save
  const markdown = renderReportAsMarkdown(report)
  await fs.writeFile(filepath, markdown, 'utf-8')

  return filepath
}
