/**
 * Character Relationship Tools - Mastra v2
 *
 * Analyze and track relationships between characters.
 * Migrated from legacy LangChain DynamicStructuredTool.
 */

import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

// ==========================================
// TYPES & SCHEMAS
// ==========================================

const RelationshipTypeSchema = z.enum([
  'ally',
  'enemy',
  'rival',
  'mentor',
  'student',
  'lover',
  'family',
  'stranger',
  'acquaintance',
  'complex',
])

type RelationshipType = z.infer<typeof RelationshipTypeSchema>

interface CharacterMetrics {
  valence: number
  arousal: number
  dominance: number
  autonomy: number
  competence: number
  relatedness: number
  transformation: number
}

interface CharacterState {
  name: string
  currentGoals: string[]
  fears: string[]
  selfDelusion?: string
  actualMotivation?: string
  metrics: CharacterMetrics
}

interface BeatCard {
  id: string
  sequence: number
  charactersInvolved: string[]
  emotionalShifts?: Record<string, { from: string; to: string }>
}

interface RelationshipEdge {
  from: string
  to: string
  type: RelationshipType
  strength: number
  trust: number
  dynamic: string
  tension?: string
  history: { beatId: string; beatSequence: number; change: string; strengthDelta: number }[]
}

interface RelationshipMatrix {
  characters: string[]
  edges: RelationshipEdge[]
  clusters: { name: string; members: string[] }[]
  centralCharacter: string
  isolatedCharacters: string[]
}

const AnalyzeRelationshipsInputSchema = z.object({
  focus: z
    .enum(['full_matrix', 'character_focus', 'cluster_analysis', 'evolution'])
    .describe('Analysis type'),
  characterName: z.string().optional().describe('Character to focus on'),
  includeHistory: z.boolean().optional().default(false).describe('Include beat history'),
  characters: z.array(z.record(z.unknown())).describe('Array of CharacterState objects'),
  beatBoard: z.array(z.record(z.unknown())).describe('Array of BeatCard objects'),
  seriesBible: z.record(z.any()).optional().describe('Series bible context'),
})

const SuggestRelationshipInputSchema = z.object({
  character1: z.string().describe('First character name'),
  character2: z.string().describe('Second character name'),
  desiredTone: z
    .enum(['conflict', 'alliance', 'romance', 'rivalry', 'mentorship', 'any'])
    .optional()
    .default('any'),
  characters: z.array(z.record(z.unknown())).describe('Array of CharacterState objects'),
})

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function buildRelationshipMatrix(
  characters: CharacterState[],
  beats: BeatCard[],
  seriesBible: Record<string, unknown> = {}
): RelationshipMatrix {
  const charNames = characters.map(c => c.name)
  const edges: RelationshipEdge[] = []

  const factions = seriesBible.factions || []
  const factionMembership: Map<string, string> = new Map()
  factions.forEach((faction: any) => {
    const members = faction.members || faction.keyMembers || []
    members.forEach((member: string) => factionMembership.set(member.toLowerCase(), faction.name))
  })

  for (let i = 0; i < charNames.length; i++) {
    for (let j = i + 1; j < charNames.length; j++) {
      const edge = inferRelationship(characters[i], characters[j], beats, factionMembership)
      if (edge) edges.push(edge)
    }
  }

  const clusters = findRelationshipClusters(edges, charNames)

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
    Array.from(connectionCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || charNames[0] || ''
  const isolatedCharacters = charNames.filter(name => {
    const totalStrength = edges
      .filter(e => e.from === name || e.to === name)
      .reduce((sum, e) => sum + Math.abs(e.strength), 0)
    return totalStrength < 20
  })

  return { characters: charNames, edges, clusters, centralCharacter, isolatedCharacters }
}

function inferRelationship(
  char1: CharacterState,
  char2: CharacterState,
  beats: BeatCard[],
  factionMembership: Map<string, string>
): RelationshipEdge | null {
  const sharedBeats = beats.filter(
    beat =>
      beat.charactersInvolved.includes(char1.name) && beat.charactersInvolved.includes(char2.name)
  )

  if (sharedBeats.length === 0) return null

  let cumulativeShift = 0
  const history: RelationshipEdge['history'] = []

  sharedBeats.forEach(beat => {
    const shift1 = beat.emotionalShifts?.[char1.name]
    const shift2 = beat.emotionalShifts?.[char2.name]
    let delta = 0

    if (shift1 && shift2) {
      const positive1 = ['happy', 'hopeful', 'trusting', 'loving'].some(e =>
        shift1.to.toLowerCase().includes(e)
      )
      const positive2 = ['happy', 'hopeful', 'trusting', 'loving'].some(e =>
        shift2.to.toLowerCase().includes(e)
      )
      if (positive1 && positive2) delta = 10
      else if (!positive1 && !positive2) delta = -5
      else delta = -10
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

  const type = determineRelationshipType(char1, char2, factionMembership)
  const baseStrength = Math.min(100, Math.max(-100, sharedBeats.length * 5 + cumulativeShift))
  const avgRelatedness = (char1.metrics.relatedness + char2.metrics.relatedness) / 2

  return {
    from: char1.name,
    to: char2.name,
    type,
    strength: baseStrength,
    trust: avgRelatedness,
    dynamic: generateDynamicDescription(type),
    history,
  }
}

function determineRelationshipType(
  char1: CharacterState,
  char2: CharacterState,
  factionMembership: Map<string, string>
): RelationshipType {
  const faction1 = factionMembership.get(char1.name.toLowerCase())
  const faction2 = factionMembership.get(char2.name.toLowerCase())

  if (faction1 && faction2 && faction1 === faction2) return 'ally'

  const goals1 = char1.currentGoals || []
  const goals2 = char2.currentGoals || []
  const fears1 = char1.fears || []
  const fears2 = char2.fears || []

  const sharedGoals = goals1.filter(g1 =>
    goals2.some(
      g2 =>
        g1.toLowerCase().includes(g2.toLowerCase()) || g2.toLowerCase().includes(g1.toLowerCase())
    )
  )
  if (sharedGoals.length > 0) return 'ally'

  const conflicting = fears1.some(f => goals2.some(g => f.toLowerCase().includes(g.toLowerCase())))
  if (conflicting) return 'rival'

  if (char1.metrics.transformation > 70 && char2.metrics.transformation < 30) return 'mentor'

  return 'acquaintance'
}

function generateDynamicDescription(type: RelationshipType): string {
  const descriptions: Record<RelationshipType, string[]> = {
    ally: ['fighting alongside each other', 'bound by shared purpose'],
    enemy: ['sworn adversaries', 'locked in conflict'],
    rival: ['competitive but respectful', 'pushing each other'],
    mentor: ['guiding and teaching', 'sharing wisdom'],
    student: ['learning and growing', 'seeking guidance'],
    lover: ['deeply connected', 'emotionally intimate'],
    family: ['bound by blood', 'familial duty'],
    stranger: ['unknown to each other', 'paths not yet crossed'],
    acquaintance: ['casual familiarity', 'surface-level connection'],
    complex: ['tangled history', 'complicated dynamic'],
  }
  const options = descriptions[type] || descriptions.acquaintance
  return options[Math.floor(Math.random() * options.length)]
}

function findRelationshipClusters(
  edges: RelationshipEdge[],
  charNames: string[]
): { name: string; members: string[] }[] {
  const clusters: { name: string; members: string[] }[] = []
  const assigned = new Set<string>()

  edges
    .filter(
      e => e.strength > 30 && (e.type === 'ally' || e.type === 'family' || e.type === 'lover')
    )
    .forEach(edge => {
      if (!assigned.has(edge.from) && !assigned.has(edge.to)) {
        clusters.push({ name: `${edge.from}/${edge.to} Alliance`, members: [edge.from, edge.to] })
        assigned.add(edge.from)
        assigned.add(edge.to)
      } else {
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

function analyzeMetricCompatibility(m1: CharacterMetrics, m2: CharacterMetrics): string[] {
  const insights: string[] = []
  if (Math.sign(m1.valence) !== Math.sign(m2.valence)) {
    insights.push(
      `TENSION: ${m1.valence > 0 ? 'Positive' : 'Negative'} vs ${m2.valence > 0 ? 'Positive' : 'Negative'} emotional baselines.`
    )
  }
  const autonomyGap = Math.abs(m1.autonomy - m2.autonomy)
  if (autonomyGap > 30)
    insights.push(`POWER DYNAMIC: ${autonomyGap}pt autonomy gap suggests mentor/student dynamic.`)
  const transformGap = Math.abs(m1.transformation - m2.transformation)
  if (transformGap > 40)
    insights.push('ARC TENSION: Character arc mismatch creates story potential.')
  return insights
}

function inferBestDynamic(char1: CharacterState, char2: CharacterState): string {
  if (Math.abs(char1.metrics.transformation - char2.metrics.transformation) > 40)
    return 'mentorship'
  if (char1.metrics.competence > 60 && char2.metrics.competence > 60) return 'rivalry'
  if (char1.metrics.relatedness > 60 && char2.metrics.relatedness > 60) return 'alliance'
  return 'complex'
}

// ==========================================
// MASTRA TOOLS
// ==========================================

export const analyzeRelationshipsTool = createTool({
  id: 'analyze_relationships',
  description:
    'Analyze character relationships. Modes: full_matrix, character_focus, cluster_analysis, evolution.',
  inputSchema: AnalyzeRelationshipsInputSchema,
  execute: async (args: any) => {
    const context = args?.context || args
    const {
      focus,
      characterName,
      includeHistory = false,
      characters,
      beatBoard,
      seriesBible = {},
    } = context

    if (characters.length < 2) {
      return JSON.stringify({ success: false, error: 'Need at least 2 characters' })
    }

    const matrix = buildRelationshipMatrix(
      characters as CharacterState[],
      beatBoard as BeatCard[],
      seriesBible
    )

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
        if (!characterName)
          return JSON.stringify({ success: false, error: 'characterName required' })
        const charEdges = matrix.edges.filter(
          e => e.from === characterName || e.to === characterName
        )
        if (charEdges.length === 0) {
          return JSON.stringify({
            success: true,
            character: characterName,
            message: 'No relationships yet.',
            suggestions: ['Add interactions'],
          })
        }
        const relationships = charEdges.map(e => ({
          otherCharacter: e.from === characterName ? e.to : e.from,
          type: e.type,
          strength: e.strength,
          trust: e.trust,
          dynamic: e.dynamic,
          ...(includeHistory && { history: e.history }),
        }))
        return JSON.stringify({
          success: true,
          character: characterName,
          totalRelationships: relationships.length,
          relationships,
        })
      }
      case 'cluster_analysis': {
        return JSON.stringify({
          success: true,
          totalClusters: matrix.clusters.length,
          clusters: matrix.clusters,
          isolatedCharacters: matrix.isolatedCharacters,
        })
      }
      case 'evolution': {
        const allChanges = matrix.edges
          .flatMap(e => e.history.map(h => ({ pair: `${e.from} ↔ ${e.to}`, ...h })))
          .sort((a, b) => a.beatSequence - b.beatSequence)
        return JSON.stringify({
          success: true,
          totalChanges: allChanges.length,
          timeline: allChanges,
        })
      }
      default:
        return JSON.stringify({ success: false, error: `Unknown focus: ${focus}` })
    }
  },
})

export const suggestRelationshipTool = createTool({
  id: 'suggest_relationship_dynamic',
  description: 'Suggest relationship dynamics between two characters based on traits and goals.',
  inputSchema: SuggestRelationshipInputSchema,
  execute: async (args: any) => {
    const context = args?.context || args
    const { character1, character2, desiredTone = 'any', characters } = context
    const char1 = (characters as CharacterState[]).find(
      c => c.name.toLowerCase() === character1.toLowerCase()
    )
    const char2 = (characters as CharacterState[]).find(
      c => c.name.toLowerCase() === character2.toLowerCase()
    )

    if (!char1 || !char2) {
      return JSON.stringify({
        success: false,
        error: `Could not find characters: ${character1}, ${character2}`,
      })
    }

    const suggestions: string[] = []

    const goals1 = char1.currentGoals || []
    const fears2 = char2.fears || []
    const goalConflicts = goals1.filter(g1 =>
      fears2.some(f => f.toLowerCase().includes(g1.toLowerCase().split(' ')[0]))
    )
    if (goalConflicts.length > 0) {
      suggestions.push(`CONFLICT: ${char1.name}'s goal threatens ${char2.name}'s fears.`)
    }

    if (char1.selfDelusion && char2.selfDelusion) {
      suggestions.push('IRONY: Similar self-delusions between characters.')
    }

    suggestions.push(...analyzeMetricCompatibility(char1.metrics, char2.metrics))

    switch (desiredTone) {
      case 'conflict':
        suggestions.push(`Use ${char1.name}'s motivation against ${char2.name}.`)
        break
      case 'alliance':
        suggestions.push('Unite against common threat.')
        break
      case 'romance':
        suggestions.push('Self-delusions attract, motivations create tension.')
        break
      case 'rivalry':
        suggestions.push('Competition for same goal.')
        break
      case 'mentorship':
        suggestions.push('Transformation gap enables guidance.')
        break
    }

    return JSON.stringify({
      success: true,
      character1: { name: char1.name, goals: char1.currentGoals, fears: char1.fears },
      character2: { name: char2.name, goals: char2.currentGoals, fears: char2.fears },
      suggestions,
      recommendedDynamic: desiredTone === 'any' ? inferBestDynamic(char1, char2) : desiredTone,
    })
  },
})

export const characterTools = [analyzeRelationshipsTool, suggestRelationshipTool]
