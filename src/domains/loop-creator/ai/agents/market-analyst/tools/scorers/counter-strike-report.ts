type DimensionScoreMap = Record<string, { score: number }>

function dimensionScore(scores: DimensionScoreMap, name: string): number {
  return scores[name]?.score ?? 0
}

export function buildCounterStrikeInsights(
  dimensionScores: DimensionScoreMap,
  finalScore: number,
): string[] {
  const insights: string[] = []
  const skillScore = dimensionScore(dimensionScores, 'Skill Expression Purity')
  const economyScore = dimensionScore(dimensionScores, 'Economy Meta-Game')
  const teamScore = dimensionScore(dimensionScores, 'Team Dynamics')
  const roundScore = dimensionScore(dimensionScores, 'Round Structure')
  const compScore = dimensionScore(dimensionScores, 'Competitive Ladder')

  if (skillScore >= 15 && roundScore >= 12) {
    insights.push('✅ Core tactical shooter elements present')
  }
  if (economyScore >= 12) {
    insights.push('✅ Economy adds strategic depth between rounds')
  } else if (economyScore < 5 && finalScore > 40) {
    insights.push('💡 Consider economy system for additional strategic layer')
  }
  if (teamScore >= 12 && skillScore >= 12) {
    insights.push('✨ Team skill combo creates esports potential')
  }
  if (teamScore < 8) {
    insights.push('⚠️ Limited team mechanics - may not appeal to CS audience')
  }
  if (compScore >= 10) {
    insights.push('🏆 Competitive infrastructure supports long-term engagement')
  }
  if (finalScore >= 70) {
    insights.push('🎯 Strong competitive shooter appeal - target skill-focused players')
  } else if (finalScore >= 40) {
    insights.push('💡 Some tactical elements - identify differentiator from CS')
  } else if (finalScore < 25) {
    insights.push('📊 Different genre focus - CS comparison less relevant')
  }

  return insights
}

export function buildCounterStrikeRecommendations(
  dimensionScores: DimensionScoreMap,
  finalScore: number,
): string[] {
  const recommendations: string[] = []
  const skillScore = dimensionScore(dimensionScores, 'Skill Expression Purity')
  const economyScore = dimensionScore(dimensionScores, 'Economy Meta-Game')
  const teamScore = dimensionScore(dimensionScores, 'Team Dynamics')
  const roundScore = dimensionScore(dimensionScores, 'Round Structure')
  const compScore = dimensionScore(dimensionScores, 'Competitive Ladder')

  if (skillScore < 12 && finalScore > 30) {
    recommendations.push('Increase skill ceiling - add mechanics that reward practice')
    recommendations.push('Consider reducing RNG to emphasize player skill')
  }
  if (economyScore < 8 && roundScore >= 10) {
    recommendations.push('Add buy phases or resource management between rounds')
  }
  if (teamScore < 10 && finalScore > 30) {
    recommendations.push('Add mechanics requiring team coordination')
  }
  if (compScore < 8 && skillScore >= 10) {
    recommendations.push('Implement ranked matchmaking for competitive players')
  }

  return recommendations
}

export function interpretCounterStrikeScore(finalScore: number): string {
  if (finalScore >= 80) {
    return 'Strong competitive shooter design. Direct competitor to CS/Valorant. Requires excellent netcode and anti-cheat investment.'
  }
  if (finalScore >= 60) {
    return 'Good tactical elements. Could carve niche in competitive space with unique hook. Study what differentiates successful entries.'
  }
  if (finalScore >= 40) {
    return 'Moderate competitive elements. May appeal to broader audience than hardcore CS fans. Define competitive vs casual balance.'
  }
  if (finalScore >= 20) {
    return 'Limited tactical shooter overlap. Design likely serves different player motivations. This is valid - not all games need to be competitive.'
  }
  return 'Minimal competitive/tactical elements. Compare against different reference games for relevant insights.'
}

export function buildCounterStrikeEsportsFactors(dimensionScores: DimensionScoreMap): string[] {
  const skillScore = dimensionScore(dimensionScores, 'Skill Expression Purity')
  const teamScore = dimensionScore(dimensionScores, 'Team Dynamics')
  const compScore = dimensionScore(dimensionScores, 'Competitive Ladder')
  const roundScore = dimensionScore(dimensionScores, 'Round Structure')

  return [
    skillScore >= 15 ? '✅ High skill ceiling' : '❌ Limited skill expression',
    teamScore >= 12 ? '✅ Team coordination' : '❌ Weak team dynamics',
    compScore >= 10 ? '✅ Competitive infrastructure' : '❌ Missing ranked systems',
    roundScore >= 12 ? '✅ Spectator-friendly format' : '❌ Unclear match flow',
  ]
}
