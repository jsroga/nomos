import {
  REFERENCE_SCORES,
  SCORING_DIMENSIONS,
  type DesignAnalysis,
} from './disco-elysium-scoring'

export interface DiscoElysiumAnalysisInput {
  mechanics: Array<{ name: string; type: string; description?: string }>
  loops?: Array<{ name: string; type: string; description?: string }>
  gameDescription?: string
}

function buildDesignAnalysis(input: DiscoElysiumAnalysisInput): DesignAnalysis {
  const allText = [
    ...input.mechanics.map(mechanic => `${mechanic.name} ${mechanic.type} ${mechanic.description || ''}`),
    ...(input.loops || []).map(loop => `${loop.name} ${loop.type} ${loop.description || ''}`),
    input.gameDescription || '',
  ]
    .join(' ')
    .toLowerCase()

  return {
    mechanics: input.mechanics,
    loops: input.loops,
    gameDescription: input.gameDescription,
    allText,
    mechanicTypes: new Set(input.mechanics.map(mechanic => mechanic.type?.toLowerCase() || 'unknown')),
    mechanicCount: input.mechanics.length,
  }
}

interface DimensionScoreEntry {
  score: number
  maxScore: number
  weight: number
  notes: string[]
  description: string
}

function scoreDimensions(analysis: DesignAnalysis) {
  const dimensionScores: Record<string, DimensionScoreEntry> = {}
  let totalWeightedScore = 0

  for (const dimension of SCORING_DIMENSIONS) {
    const dimensionResult = dimension.scoringLogic(analysis)
    dimensionScores[dimension.name] = {
      score: dimensionResult.score,
      maxScore: dimension.maxPoints,
      weight: dimension.weight,
      notes: dimensionResult.notes,
      description: dimension.description,
    }
    totalWeightedScore += (dimensionResult.score / dimension.maxPoints) * dimension.weight * 100
  }

  return { dimensionScores, totalWeightedScore }
}

function buildDiscoInsights(
  finalScore: number,
  allText: string,
  dimensionScores: ReturnType<typeof scoreDimensions>['dimensionScores'],
) {
  const insights: string[] = []
  const narrativeScore = dimensionScores['Narrative Architecture'].score
  const choiceScore = dimensionScores['Choice Consequence Depth'].score
  const dialogueScore = dimensionScores['Dialogue as Gameplay'].score

  if (narrativeScore >= 15) {
    insights.push('✅ Strong narrative foundation - appeals to story-driven players')
  } else if (narrativeScore < 8) {
    insights.push('⚠️ Minimal narrative elements - consider if this matches target audience')
  }

  if (choiceScore >= 15 && narrativeScore >= 15) {
    insights.push('✅ Choice + narrative combo creates replayability through different paths')
  }

  if (dialogueScore >= 10 && !allText.includes('combat')) {
    insights.push('✨ Dialogue-primary design follows Disco Elysium\'s innovative approach')
  }

  if (finalScore >= 70) {
    insights.push('🎯 Strong Disco Elysium-style appeal - target narrative RPG audience')
  } else if (finalScore >= 40) {
    insights.push('💡 Moderate narrative elements - could expand to capture RPG audience')
  } else if (finalScore < 20) {
    insights.push(
      '📊 Design prioritizes other elements over narrative - this is valid for action/arcade games',
    )
  }

  return insights
}

function buildDiscoRecommendations(
  finalScore: number,
  dimensionScores: ReturnType<typeof scoreDimensions>['dimensionScores'],
) {
  const recommendations: string[] = []
  const narrativeScore = dimensionScores['Narrative Architecture'].score
  const choiceScore = dimensionScores['Choice Consequence Depth'].score
  const dialogueScore = dimensionScores['Dialogue as Gameplay'].score

  if (narrativeScore < 10 && finalScore > 30) {
    recommendations.push('Add environmental storytelling or lore collectibles')
  }

  if (choiceScore < 10 && narrativeScore >= 10) {
    recommendations.push('Implement meaningful choices with visible consequences')
  }

  if (dialogueScore < 5 && narrativeScore >= 10) {
    recommendations.push('Consider adding character dialogues or internal monologue')
  }

  return recommendations
}

function interpretDiscoScore(finalScore: number): string {
  if (finalScore >= 80) {
    return 'Exceptional narrative RPG design - comparable to genre leaders. Will strongly appeal to Disco Elysium/Planescape fans.'
  }

  if (finalScore >= 60) {
    return 'Strong narrative RPG elements. Could appeal to story-driven players while maintaining other gameplay focuses.'
  }

  if (finalScore >= 40) {
    return 'Moderate narrative presence. Consider if target audience expects deeper story integration.'
  }

  if (finalScore >= 20) {
    return 'Light narrative elements. Design prioritizes gameplay over story - valid approach for action/arcade games.'
  }

  return 'Minimal narrative focus. This is appropriate for mechanics-driven games but won\'t appeal to narrative RPG fans.'
}

export function analyzeDiscoElysiumScore(input: DiscoElysiumAnalysisInput) {
  const analysis = buildDesignAnalysis(input)
  const { dimensionScores, totalWeightedScore } = scoreDimensions(analysis)
  const finalScore = Math.round(totalWeightedScore)
  const insights = buildDiscoInsights(finalScore, analysis.allText, dimensionScores)
  const recommendations = buildDiscoRecommendations(finalScore, dimensionScores)

  return {
    success: true as const,
    scoreName: 'Disco Elysium Score',
    scoreType: 'Narrative RPG Elements',
    finalScore,
    maxScore: 100,
    breakdown: dimensionScores,
    insights,
    recommendations,
    interpretation: interpretDiscoScore(finalScore),
    calibration: {
      note: 'Score calibrated against known games',
      references: REFERENCE_SCORES,
    },
    _analysis: {
      mechanicCount: analysis.mechanicCount,
      uniqueTypes: Array.from(analysis.mechanicTypes),
      hasDialogue: analysis.allText.includes('dialogue'),
      hasChoice: analysis.allText.includes('choice'),
      hasCombat: analysis.allText.includes('combat'),
    },
  }
}
