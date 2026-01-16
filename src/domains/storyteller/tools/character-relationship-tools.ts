/**
 * Character Relationship Tools
 *
 * Analyze and track relationships between characters.
 * Generates relationship matrices, tracks evolution over time,
 * and suggests relationship dynamics for story beats.
 */

import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { WritersRoomState, CharacterState, BeatCard, CharacterMetrics } from '../graph/state'

// Relationship types and dynamics
type RelationshipType =
  | 'ally'
  | 'enemy'
  | 'rival'
  | 'mentor'
  | 'student'
  | 'lover'
  | 'family'
  | 'stranger'
  | 'acquaintance'
  | 'complex'

interface RelationshipEdge {
  from: string
  to: string
  type: RelationshipType
  strength: number // -100 (hate) to +100 (love/devotion)
  trust: number // 0-100
  dynamic: string // brief description of the relationship
  tension?: string // current source of tension
  history: {
    beatId: string
    beatSequence: number
    change: string
    strengthDelta: number
  }[]
}

interface RelationshipMatrix {
  characters: string[]
  edges: RelationshipEdge[]
  clusters: { name: string; members: string[] }[]
  centralCharacter: string
  isolatedCharacters: string[]
}

/**
 * Analyze relationships from character states and beat interactions
 */
function buildRelationshipMatrix(
  characters: CharacterState[],
  beats: BeatCard[],
  seriesBible: Record<string, any>
): RelationshipMatrix {
  const charNames = characters.map(c => c.name)
  const edges: RelationshipEdge[] = []

  // Build initial relationships from series bible
  const bibleChars = seriesBible.keyCharacters || []
  const factions = seriesBible.factions || []

  // Infer relationships from faction membership
  const factionMembership: Map<string, string> = new Map()
  factions.forEach((faction: any) => {
    const members = faction.members || faction.keyMembers || []
    members.forEach((member: string) => {
      factionMembership.set(member.toLowerCase(), faction.name)
    })
  })

  // Create edges for all character pairs
  for (let i = 0; i < charNames.length; i++) {
    for (let j = i + 1; j < charNames.length; j++) {
      const char1 = characters[i]
      const char2 = characters[j]

      // Calculate relationship based on various factors
      const edge = inferRelationship(char1, char2, beats, factionMembership)
      if (edge) {
        edges.push(edge)
      }
    }
  }

  // Find clusters (characters who interact frequently)
  const clusters = findRelationshipClusters(edges, charNames)

  // Find central character (most connections)
  const connectionCounts = new Map<string, number>()
  charNames.forEach(name => connectionCounts.set(name, 0))
  edges.forEach(edge => {
    connectionCounts.set(
      edge.from,
      (connectionCounts.get(edge.from) || 0) + Math.abs(edge.strength)
    )
    connectionCounts.set(edge.to, (connectionCounts.get(edge.to) || 0) + Math.abs(edge.strength))
  })

  const centralCharacter =
    [...connectionCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || charNames[0] || ''

  // Find isolated characters (weak connections)
  const isolatedCharacters = charNames.filter(name => {
    const totalStrength = edges
      .filter(e => e.from === name || e.to === name)
      .reduce((sum, e) => sum + Math.abs(e.strength), 0)
    return totalStrength < 20 // Very weak connections
  })

  return {
    characters: charNames,
    edges,
    clusters,
    centralCharacter,
    isolatedCharacters,
  }
}

/**
 * Infer relationship between two characters
 */
function inferRelationship(
  char1: CharacterState,
  char2: CharacterState,
  beats: BeatCard[],
  factionMembership: Map<string, string>
): RelationshipEdge | null {
  // Count co-appearances in beats
  const sharedBeats = beats.filter(
    beat =>
      beat.charactersInvolved.includes(char1.name) && beat.charactersInvolved.includes(char2.name)
  )

  if (sharedBeats.length === 0) {
    return null // No interaction
  }

  // Analyze emotional shifts in shared beats
  let cumulativeShift = 0
  const history: RelationshipEdge['history'] = []

  sharedBeats.forEach(beat => {
    const shift1 = beat.emotionalShifts?.[char1.name]
    const shift2 = beat.emotionalShifts?.[char2.name]

    // Positive shared experiences build relationships
    // Negative shared experiences can build or destroy them
    let delta = 0

    if (shift1 && shift2) {
      const positive1 = ['happy', 'hopeful', 'trusting', 'loving'].some(e =>
        shift1.to.toLowerCase().includes(e)
      )
      const positive2 = ['happy', 'hopeful', 'trusting', 'loving'].some(e =>
        shift2.to.toLowerCase().includes(e)
      )

      if (positive1 && positive2) delta = 10
      else if (!positive1 && !positive2)
        delta = -5 // Shared suffering
      else delta = -10 // Divergent emotions
    }

    if (delta !== 0) {
      cumulativeShift += delta
      history.push({
        beatId: beat.id,
        beatSequence: beat.sequence,
        change: `${char1.name} felt ${shift1?.to || 'unchanged'}, ${char2.name} felt ${shift2?.to || 'unchanged'}`,
        strengthDelta: delta,
      })
    }
  })

  // Determine relationship type based on goals and metrics
  const type = determineRelationshipType(char1, char2, factionMembership)

  // Calculate base strength
  const baseStrength = Math.min(100, Math.max(-100, sharedBeats.length * 5 + cumulativeShift))

  // Calculate trust based on relatedness metric
  const avgRelatedness = (char1.metrics.relatedness + char2.metrics.relatedness) / 2

  return {
    from: char1.name,
    to: char2.name,
    type,
    strength: baseStrength,
    trust: avgRelatedness,
    dynamic: generateDynamicDescription(char1, char2, type),
    history,
  }
}

/**
 * Determine relationship type
 */
function determineRelationshipType(
  char1: CharacterState,
  char2: CharacterState,
  factionMembership: Map<string, string>
): RelationshipType {
  const faction1 = factionMembership.get(char1.name.toLowerCase())
  const faction2 = factionMembership.get(char2.name.toLowerCase())

  // Check for faction-based relationships
  if (faction1 && faction2) {
    if (faction1 === faction2) return 'ally'
    // Could check for hostile factions
  }

  // Check for goal alignment
  const sharedGoals = char1.currentGoals.filter(g1 =>
    char2.currentGoals.some(
      g2 =>
        g1.toLowerCase().includes(g2.toLowerCase()) || g2.toLowerCase().includes(g1.toLowerCase())
    )
  )

  if (sharedGoals.length > 0) return 'ally'

  // Check for opposing fears (one fears what other wants)
  const conflicting = char1.fears.some(f =>
    char2.currentGoals.some(g => f.toLowerCase().includes(g.toLowerCase()))
  )

  if (conflicting) return 'rival'

  // Check metrics for relationship hints
  if (char1.metrics.transformation > 70 && char2.metrics.transformation < 30) {
    return 'mentor' // More transformed character mentoring less transformed
  }

  return 'acquaintance'
}

/**
 * Generate dynamic description
 */
function generateDynamicDescription(
  char1: CharacterState,
  char2: CharacterState,
  type: RelationshipType
): string {
  const descriptions: Record<RelationshipType, string[]> = {
    ally: ['fighting alongside each other', 'bound by shared purpose', 'trusting companions'],
    enemy: ['sworn adversaries', 'locked in conflict', 'mortal enemies'],
    rival: ['competitive but respectful', 'pushing each other', 'reluctant competitors'],
    mentor: ['guiding and teaching', 'sharing wisdom', 'nurturing growth'],
    student: ['learning and growing', 'seeking guidance', 'developing skills'],
    lover: ['deeply connected', 'romantically entwined', 'emotionally intimate'],
    family: ['bound by blood', 'familial duty', 'shared heritage'],
    stranger: ['unknown to each other', 'paths not yet crossed', 'potential connection'],
    acquaintance: ['casual familiarity', 'surface-level connection', 'aware of each other'],
    complex: ['tangled history', 'mixed feelings', 'complicated dynamic'],
  }

  const options = descriptions[type] || descriptions.acquaintance
  return options[Math.floor(Math.random() * options.length)]
}

/**
 * Find relationship clusters
 */
function findRelationshipClusters(
  edges: RelationshipEdge[],
  charNames: string[]
): { name: string; members: string[] }[] {
  // Simple clustering based on strong positive connections
  const clusters: { name: string; members: string[] }[] = []
  const assigned = new Set<string>()

  // Group characters with strong positive relationships
  edges
    .filter(
      e => e.strength > 30 && (e.type === 'ally' || e.type === 'family' || e.type === 'lover')
    )
    .forEach(edge => {
      if (!assigned.has(edge.from) && !assigned.has(edge.to)) {
        clusters.push({
          name: `${edge.from}/${edge.to} Alliance`,
          members: [edge.from, edge.to],
        })
        assigned.add(edge.from)
        assigned.add(edge.to)
      } else {
        // Add to existing cluster
        const existingCluster = clusters.find(
          c => c.members.includes(edge.from) || c.members.includes(edge.to)
        )
        if (existingCluster) {
          if (!existingCluster.members.includes(edge.from)) {
            existingCluster.members.push(edge.from)
            assigned.add(edge.from)
          }
          if (!existingCluster.members.includes(edge.to)) {
            existingCluster.members.push(edge.to)
            assigned.add(edge.to)
          }
        }
      }
    })

  return clusters
}

/**
 * Main Character Relationship Analyzer Tool
 */
export const createRelationshipAnalyzerTool = (state: WritersRoomState) => {
  return new DynamicStructuredTool({
    name: 'analyze_relationships',
    description: `Analyze and visualize character relationships in the story.

This tool provides:
- Relationship matrix showing all character connections
- Relationship types (ally, enemy, rival, mentor, etc.)
- Relationship strength (-100 to +100) and trust levels
- Relationship evolution history through beats
- Character clusters and isolated characters
- Central/protagonist identification

Use this tool to:
- Understand existing relationship dynamics
- Find opportunities for relationship conflict
- Identify isolated characters who need connections
- Track how relationships evolve through the story
- Plan relationship arcs`,
    schema: z.object({
      focus: z
        .enum(['full_matrix', 'character_focus', 'cluster_analysis', 'evolution'])
        .describe('Type of analysis to perform'),
      characterName: z
        .string()
        .optional()
        .describe('Character to focus on (required for character_focus)'),
      includeHistory: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include beat-by-beat relationship history'),
    }),
    func: async ({ focus, characterName, includeHistory }) => {
      if (state.characters.length < 2) {
        return JSON.stringify({
          success: false,
          error: 'Need at least 2 characters to analyze relationships',
        })
      }

      const matrix = buildRelationshipMatrix(state.characters, state.beatBoard, state.seriesBible)

      switch (focus) {
        case 'full_matrix': {
          const edgeSummaries = matrix.edges.map(e => ({
            pair: `${e.from} ↔ ${e.to}`,
            type: e.type,
            strength: e.strength,
            trust: e.trust,
            dynamic: e.dynamic,
            ...(includeHistory && { history: e.history }),
          }))

          return JSON.stringify({
            success: true,
            totalCharacters: matrix.characters.length,
            totalRelationships: matrix.edges.length,
            centralCharacter: matrix.centralCharacter,
            isolatedCharacters: matrix.isolatedCharacters,
            relationships: edgeSummaries,
            clusters: matrix.clusters,
          })
        }

        case 'character_focus': {
          if (!characterName) {
            return JSON.stringify({
              success: false,
              error: 'characterName required for character_focus',
            })
          }

          const charEdges = matrix.edges.filter(
            e => e.from === characterName || e.to === characterName
          )

          if (charEdges.length === 0) {
            return JSON.stringify({
              success: true,
              character: characterName,
              message: `${characterName} has no established relationships yet.`,
              suggestions: [
                'Have them interact with other characters in beats',
                'Establish their faction membership',
                'Create shared goals with existing characters',
              ],
            })
          }

          const relationships = charEdges.map(e => ({
            otherCharacter: e.from === characterName ? e.to : e.from,
            type: e.type,
            strength: e.strength,
            trust: e.trust,
            dynamic: e.dynamic,
            tension: e.tension,
            ...(includeHistory && { history: e.history }),
          }))

          // Find strongest ally and enemy
          const strongestAlly = relationships
            .filter(r => r.strength > 0)
            .sort((a, b) => b.strength - a.strength)[0]
          const strongestEnemy = relationships
            .filter(r => r.strength < 0)
            .sort((a, b) => a.strength - b.strength)[0]

          return JSON.stringify({
            success: true,
            character: characterName,
            totalRelationships: relationships.length,
            strongestAlly: strongestAlly?.otherCharacter || 'None',
            strongestEnemy: strongestEnemy?.otherCharacter || 'None',
            relationships: relationships,
          })
        }

        case 'cluster_analysis': {
          return JSON.stringify({
            success: true,
            totalClusters: matrix.clusters.length,
            clusters: matrix.clusters.map(c => ({
              name: c.name,
              members: c.members,
              size: c.members.length,
            })),
            isolatedCharacters: matrix.isolatedCharacters,
            suggestion:
              matrix.isolatedCharacters.length > 0
                ? `Consider connecting ${matrix.isolatedCharacters.join(', ')} to existing clusters or creating new relationship arcs for them.`
                : 'All characters are well-connected.',
          })
        }

        case 'evolution': {
          // Get all relationship changes over time
          const allChanges = matrix.edges
            .flatMap(e =>
              e.history.map(h => ({
                pair: `${e.from} ↔ ${e.to}`,
                ...h,
              }))
            )
            .sort((a, b) => a.beatSequence - b.beatSequence)

          return JSON.stringify({
            success: true,
            totalChanges: allChanges.length,
            timeline: allChanges,
            summary: `Relationship evolution across ${state.beatBoard.length} beats`,
          })
        }

        default:
          return JSON.stringify({ success: false, error: `Unknown focus: ${focus}` })
      }
    },
  })
}

/**
 * Suggest relationship dynamics tool
 */
export const createRelationshipSuggestionTool = (state: WritersRoomState) => {
  return new DynamicStructuredTool({
    name: 'suggest_relationship_dynamic',
    description:
      'Get suggestions for relationship dynamics between two characters based on their traits, goals, and current state.',
    schema: z.object({
      character1: z.string().describe('First character name'),
      character2: z.string().describe('Second character name'),
      desiredTone: z
        .enum(['conflict', 'alliance', 'romance', 'rivalry', 'mentorship', 'any'])
        .optional()
        .default('any')
        .describe('Desired relationship tone for suggestions'),
    }),
    func: async ({ character1, character2, desiredTone }) => {
      const char1 = state.characters.find(c => c.name.toLowerCase() === character1.toLowerCase())
      const char2 = state.characters.find(c => c.name.toLowerCase() === character2.toLowerCase())

      if (!char1 || !char2) {
        return JSON.stringify({
          success: false,
          error: `Could not find one or both characters: ${character1}, ${character2}`,
        })
      }

      const suggestions: string[] = []

      // Analyze goals for conflict/alliance opportunities
      const goalConflicts = char1.currentGoals.filter(g1 =>
        char2.fears.some(f => f.toLowerCase().includes(g1.toLowerCase().split(' ')[0]))
      )

      if (goalConflicts.length > 0) {
        suggestions.push(
          `CONFLICT OPPORTUNITY: ${char1.name}'s goal "${goalConflicts[0]}" threatens ${char2.name}'s fears.`
        )
      }

      // Check for shared delusions
      if (char1.selfDelusion && char2.selfDelusion) {
        if (
          char1.selfDelusion.toLowerCase().includes(char2.selfDelusion.toLowerCase().split(' ')[0])
        ) {
          suggestions.push(
            `IRONY: Both characters share similar self-delusions - ${char1.name}: "${char1.selfDelusion}" vs ${char2.name}: "${char2.selfDelusion}"`
          )
        }
      }

      // Check metric compatibility
      const metricsAnalysis = analyzeMetricCompatibility(char1.metrics, char2.metrics)
      suggestions.push(...metricsAnalysis)

      // Generate tone-specific suggestions
      switch (desiredTone) {
        case 'conflict':
          suggestions.push(
            `Create a situation where ${char1.name}'s actual motivation ("${char1.actualMotivation}") directly threatens ${char2.name}.`
          )
          break
        case 'alliance':
          suggestions.push('Unite them against a common threat that triggers both their fears.')
          break
        case 'romance':
          suggestions.push(
            'Their self-delusions could initially attract them to each other, while their actual motivations create tension.'
          )
          break
        case 'rivalry':
          suggestions.push(
            'Put them in competition for the same goal, each believing only they can achieve it.'
          )
          break
        case 'mentorship':
          suggestions.push(
            `${char1.metrics.transformation > char2.metrics.transformation ? char1.name : char2.name} could guide the other through their transformation arc.`
          )
          break
      }

      return JSON.stringify({
        success: true,
        character1: { name: char1.name, goals: char1.currentGoals, fears: char1.fears },
        character2: { name: char2.name, goals: char2.currentGoals, fears: char2.fears },
        suggestions: suggestions,
        recommendedDynamic: desiredTone === 'any' ? inferBestDynamic(char1, char2) : desiredTone,
      })
    },
  })
}

/**
 * Analyze metric compatibility
 */
function analyzeMetricCompatibility(m1: CharacterMetrics, m2: CharacterMetrics): string[] {
  const insights: string[] = []

  // Valence compatibility
  if (Math.sign(m1.valence) !== Math.sign(m2.valence)) {
    insights.push(
      `TENSION: ${m1.valence > 0 ? 'Positive' : 'Negative'} vs ${m2.valence > 0 ? 'Positive' : 'Negative'} emotional baselines create natural friction.`
    )
  }

  // Autonomy gap
  const autonomyGap = Math.abs(m1.autonomy - m2.autonomy)
  if (autonomyGap > 30) {
    insights.push(
      `POWER DYNAMIC: ${autonomyGap}pt autonomy gap suggests potential mentor/student or leader/follower dynamic.`
    )
  }

  // Transformation alignment
  const transformGap = Math.abs(m1.transformation - m2.transformation)
  if (transformGap > 40) {
    insights.push(
      'ARC TENSION: One character is much further along their arc - could create jealousy, mentorship, or reflection.'
    )
  }

  return insights
}

/**
 * Infer best dynamic based on character states
 */
function inferBestDynamic(char1: CharacterState, char2: CharacterState): string {
  const m1 = char1.metrics
  const m2 = char2.metrics

  // Check for mentor/student potential
  if (Math.abs(m1.transformation - m2.transformation) > 40) {
    return 'mentorship'
  }

  // Check for rivalry potential
  if (m1.competence > 60 && m2.competence > 60) {
    return 'rivalry'
  }

  // Check for alliance potential
  if (m1.relatedness > 60 && m2.relatedness > 60) {
    return 'alliance'
  }

  // Default to complex
  return 'complex'
}

export const relationshipTools = [
  // Factory functions - called at runtime with state
]
