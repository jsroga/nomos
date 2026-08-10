/**
 * Jacek Confirm this regex — classifies mechanics by matching 'narrative',
 * 'dialogue', 'story', 'choice', 'decision', 'consequence', 'character' in
 * names/types rather than by behaviour.
 * See .local/findings/word-dictionary-heuristics.md (Group B).
 */
export interface DesignAnalysis {
  mechanics: Array<{ name: string; type: string; description?: string }>
  loops?: Array<{ name: string; type: string; description?: string }>
  gameDescription?: string
  allText: string
  mechanicTypes: Set<string>
  mechanicCount: number
}

interface ScoringDimension {
  name: string
  weight: number
  maxPoints: number
  description: string
  scoringLogic: (analysis: DesignAnalysis) => { score: number; notes: string[] }
}

export const REFERENCE_SCORES = {
  'Disco Elysium': { score: 95, notes: 'Gold standard for narrative RPG' },
  'Planescape Torment': { score: 88, notes: 'Classic narrative depth' },
  'Baldur\'s Gate 3': { score: 82, notes: 'Modern AAA narrative RPG' },
  Hades: { score: 65, notes: 'Action with narrative integration' },
  'Mass Effect': { score: 72, notes: 'Choice-driven sci-fi RPG' },
  'Vampire Survivors': { score: 8, notes: 'Minimal narrative elements' },
  'Counter-Strike': { score: 3, notes: 'No narrative focus' },
}

export const SCORING_DIMENSIONS: ScoringDimension[] = [
  {
    name: 'Narrative Architecture',
    weight: 0.25,
    maxPoints: 25,
    description: 'How deeply narrative is woven into gameplay structure',
    scoringLogic: analysis => {
      let score = 0
      const notes: string[] = []

      // Check for narrative-driven mechanics
      const narrativeIndicators = [
        { term: 'story', points: 3, note: 'Story elements present' },
        { term: 'narrative', points: 4, note: 'Narrative integration detected' },
        { term: 'dialogue', points: 5, note: 'Dialogue system found' },
        { term: 'character', points: 3, note: 'Character focus' },
        { term: 'lore', points: 2, note: 'Lore/world-building' },
        { term: 'quest', points: 3, note: 'Quest structure' },
        { term: 'choice', points: 4, note: 'Player choice system' },
        { term: 'branch', points: 4, note: 'Branching narrative' },
      ]

      for (const indicator of narrativeIndicators) {
        if (analysis.allText.includes(indicator.term)) {
          score += indicator.points
          notes.push(indicator.note)
        }
      }

      // Bonus: Narrative as core mechanic (like Disco Elysium)
      const narrativeMechanics = analysis.mechanics.filter(
        m =>
          m.type?.toLowerCase().includes('narrative') ||
          m.type?.toLowerCase().includes('dialogue') ||
          m.type?.toLowerCase().includes('story')
      )
      if (narrativeMechanics.length > 0) {
        score += 5
        notes.push(`Narrative is a primary mechanic (${narrativeMechanics.length} mechanics)`)
      }

      // Penalty: Combat-heavy designs deprioritize narrative
      if (analysis.allText.includes('combat') && !analysis.allText.includes('dialogue')) {
        score -= 3
        notes.push('Combat-focused without dialogue balance')
      }

      return { score: Math.min(25, Math.max(0, score)), notes }
    },
  },
  {
    name: 'Choice Consequence Depth',
    weight: 0.25,
    maxPoints: 25,
    description: 'Meaningful decisions with lasting impact',
    scoringLogic: analysis => {
      let score = 0
      const notes: string[] = []

      // Core choice indicators
      const choiceIndicators = [
        { term: 'choice', points: 4, note: 'Choice system present' },
        { term: 'consequence', points: 5, note: 'Consequences implemented' },
        { term: 'decision', points: 3, note: 'Decision points' },
        { term: 'branch', points: 4, note: 'Branching paths' },
        { term: 'ending', points: 4, note: 'Multiple endings' },
        { term: 'faction', points: 3, note: 'Faction relationships' },
        { term: 'reputation', points: 3, note: 'Reputation system' },
        { term: 'morality', points: 3, note: 'Moral complexity' },
      ]

      for (const indicator of choiceIndicators) {
        if (analysis.allText.includes(indicator.term)) {
          score += indicator.points
          notes.push(indicator.note)
        }
      }

      // Disco Elysium special: No "right" answers
      if (analysis.allText.includes('fail') && analysis.allText.includes('success')) {
        score += 3
        notes.push('Failure as valid outcome')
      }

      // Check for choice mechanics
      const choiceMechanics = analysis.mechanics.filter(
        m =>
          m.name.toLowerCase().includes('choice') ||
          m.description?.toLowerCase().includes('decision') ||
          m.description?.toLowerCase().includes('consequence')
      )
      if (choiceMechanics.length >= 2) {
        score += 4
        notes.push('Multiple choice-driven mechanics')
      }

      return { score: Math.min(25, Math.max(0, score)), notes }
    },
  },
  {
    name: 'Character System Sophistication',
    weight: 0.2,
    maxPoints: 20,
    description: 'Depth of character customization affecting narrative',
    scoringLogic: analysis => {
      let score = 0
      const notes: string[] = []

      // Skill/stat indicators
      const systemIndicators = [
        { term: 'skill', points: 4, note: 'Skill system' },
        { term: 'stat', points: 3, note: 'Stats present' },
        { term: 'attribute', points: 3, note: 'Attributes system' },
        { term: 'class', points: 2, note: 'Class system' },
        { term: 'build', points: 3, note: 'Build variety' },
        { term: 'specialization', points: 3, note: 'Specialization options' },
        { term: 'personality', points: 4, note: 'Personality traits' },
        { term: 'thought', points: 4, note: 'Internal thought system (DE-like)' },
      ]

      for (const indicator of systemIndicators) {
        if (analysis.allText.includes(indicator.term)) {
          score += indicator.points
          notes.push(indicator.note)
        }
      }

      // Disco Elysium special: Skills as personalities
      if (
        analysis.allText.includes('skill') &&
        (analysis.allText.includes('voice') || analysis.allText.includes('personality'))
      ) {
        score += 5
        notes.push('Skills with personality (DE signature)')
      }

      // Check for character-affecting mechanics
      const characterMechanics = analysis.mechanics.filter(
        m =>
          m.type?.toLowerCase().includes('character') ||
          m.type?.toLowerCase().includes('progression') ||
          m.type?.toLowerCase().includes('skill')
      )
      if (characterMechanics.length >= 2) {
        score += 3
        notes.push('Character progression depth')
      }

      return { score: Math.min(20, Math.max(0, score)), notes }
    },
  },
  {
    name: 'Dialogue as Gameplay',
    weight: 0.15,
    maxPoints: 15,
    description: 'Conversation systems that are mechanically engaging',
    scoringLogic: analysis => {
      let score = 0
      const notes: string[] = []

      const dialogueIndicators = [
        { term: 'dialogue', points: 5, note: 'Dialogue system' },
        { term: 'conversation', points: 4, note: 'Conversation mechanics' },
        { term: 'npc', points: 2, note: 'NPC interactions' },
        { term: 'persuade', points: 3, note: 'Persuasion mechanics' },
        { term: 'negotiate', points: 3, note: 'Negotiation' },
        { term: 'speech', points: 2, note: 'Speech checks' },
        { term: 'lie', points: 2, note: 'Deception options' },
        { term: 'insight', points: 2, note: 'Character insight' },
      ]

      for (const indicator of dialogueIndicators) {
        if (analysis.allText.includes(indicator.term)) {
          score += indicator.points
          notes.push(indicator.note)
        }
      }

      // Bonus: No combat, dialogue is primary
      if (!analysis.allText.includes('combat') && analysis.allText.includes('dialogue')) {
        score += 4
        notes.push('Dialogue-primary design (DE approach)')
      }

      // Check for dialogue mechanics
      const dialogueMechanics = analysis.mechanics.filter(
        m =>
          m.name.toLowerCase().includes('dialogue') ||
          m.name.toLowerCase().includes('conversation') ||
          m.type?.toLowerCase().includes('social')
      )
      if (dialogueMechanics.length > 0) {
        score += 3
        notes.push('Dedicated dialogue mechanics')
      }

      return { score: Math.min(15, Math.max(0, score)), notes }
    },
  },
  {
    name: 'Thematic Cohesion',
    weight: 0.15,
    maxPoints: 15,
    description: 'Unified theme expressed through mechanics',
    scoringLogic: analysis => {
      let score = 0
      const notes: string[] = []

      // Theme indicators
      const themeIndicators = [
        { term: 'theme', points: 3, note: 'Explicit theme' },
        { term: 'philosophy', points: 4, note: 'Philosophical depth' },
        { term: 'political', points: 3, note: 'Political themes' },
        { term: 'identity', points: 3, note: 'Identity exploration' },
        { term: 'memory', points: 3, note: 'Memory themes' },
        { term: 'trauma', points: 2, note: 'Trauma exploration' },
        { term: 'existential', points: 3, note: 'Existential themes' },
        { term: 'detective', points: 2, note: 'Investigation theme' },
      ]

      for (const indicator of themeIndicators) {
        if (analysis.allText.includes(indicator.term)) {
          score += indicator.points
          notes.push(indicator.note)
        }
      }

      // Mechanic-theme alignment
      if (analysis.mechanics.length > 0) {
        const uniqueTypes = analysis.mechanicTypes.size
        const totalMechanics = analysis.mechanicCount

        // Lower variety suggests more focused theme
        if (totalMechanics >= 3 && uniqueTypes <= 3) {
          score += 3
          notes.push('Focused mechanical theme')
        }
      }

      // Narrative RPG special: World-building
      if (analysis.allText.includes('world') && analysis.allText.includes('lore')) {
        score += 2
        notes.push('World-building present')
      }

      return { score: Math.min(15, Math.max(0, score)), notes }
    },
  },
]
