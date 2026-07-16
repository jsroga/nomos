type DimensionScoreMap = Record<string, { score: number }>

function dimensionScore(scores: DimensionScoreMap, name: string): number {
  return scores[name]?.score ?? 0
}

export function buildVampireSurvivorsInsights(
  dimensionScores: DimensionScoreMap,
  finalScore: number,
): string[] {
  const insights: string[] = []
  const dopamineScore = dimensionScore(dimensionScores, 'Dopamine Loop Design')
  const inputScore = dimensionScore(dimensionScores, 'Input Simplicity')
  const powerScore = dimensionScore(dimensionScores, 'Power Fantasy Escalation')
  const sessionScore = dimensionScore(dimensionScores, 'Session Architecture')
  const unlockScore = dimensionScore(dimensionScores, 'Content Revelation')

  if (dopamineScore >= 15 && inputScore >= 12) {
    insights.push('✅ Core VS formula present: Low friction + high reward frequency')
  }
  if (powerScore >= 15) {
    insights.push('✅ Strong power fantasy - players will feel increasingly powerful')
  } else if (powerScore < 8) {
    insights.push('⚠️ Limited power scaling - consider upgrade/evolution systems')
  }
  if (inputScore >= 15) {
    insights.push('✨ Accessible design - wide audience appeal like VS')
  } else if (inputScore < 8) {
    insights.push('⚠️ Higher input complexity limits accessibility')
  }
  if (unlockScore >= 10 && sessionScore >= 8) {
    insights.push('🎯 "One more run" hook likely strong')
  }
  if (finalScore >= 70) {
    insights.push('🎮 Strong VS-like appeal - target action/casual crossover audience')
  } else if (finalScore >= 45) {
    insights.push('💡 Some VS elements but different focus - identify unique value')
  } else if (finalScore < 30) {
    insights.push('📊 Different genre approach - VS comparison less relevant')
  }

  return insights
}

export function buildVampireSurvivorsRecommendations(dimensionScores: DimensionScoreMap): string[] {
  const recommendations: string[] = []
  const dopamineScore = dimensionScore(dimensionScores, 'Dopamine Loop Design')
  const inputScore = dimensionScore(dimensionScores, 'Input Simplicity')
  const powerScore = dimensionScore(dimensionScores, 'Power Fantasy Escalation')
  const unlockScore = dimensionScore(dimensionScores, 'Content Revelation')

  if (dopamineScore < 12) {
    recommendations.push('Add frequent visual/audio feedback for player actions')
    recommendations.push('Consider XP gem-style collectibles for constant reward')
  }
  if (inputScore < 10) {
    recommendations.push('Explore auto-attack or reduced input options')
  }
  if (powerScore < 12) {
    recommendations.push('Add weapon evolution or synergy systems')
    recommendations.push('Let players become intentionally overpowered')
  }
  if (unlockScore < 8) {
    recommendations.push('Implement character/weapon unlocks tied to runs')
  }

  return recommendations
}

export function interpretVampireSurvivorsScore(finalScore: number): string {
  if (finalScore >= 80) {
    return 'Exceptional VS-style design. Expect strong appeal to action roguelike and casual audiences. Highly streamable.'
  }
  if (finalScore >= 60) {
    return 'Good VS elements. Could compete in survivors-like market with polish. Consider what differentiates from VS clones.'
  }
  if (finalScore >= 40) {
    return 'Moderate action elements. May appeal to different audience than VS fans. Identify your unique hook.'
  }
  if (finalScore >= 20) {
    return 'Limited VS overlap. Design likely targets different player motivations. This is valid - not everything needs to be VS-like.'
  }
  return 'Minimal action/accessibility focus. Compare against different reference games for more relevant insights.'
}
