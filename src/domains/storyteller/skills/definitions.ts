/**
 * Skill Definitions
 *
 * Defines specialized knowledge modules that agents can load on-demand.
 * Each skill is a focused piece of knowledge that helps an agent perform better.
 */

import { Skill } from './skill-loader'

// ============================================
// WRITER SKILLS
// ============================================

export const WRITER_SKILLS: Record<string, Skill> = {
  'script-format': {
    id: 'script-format',
    name: 'Script Formatting',
    description: 'Professional screenplay format (Fountain syntax)',
    category: 'writer',
    tags: ['formatting', 'structure', 'fountain'],
    tokens: 200,
    content: `# Script Format Guidelines

## Scene Headings
\`\`\`
INT. LOCATION - TIME OF DAY
EXT. LOCATION - TIME OF DAY
\`\`\`

## Action Lines
- Present tense, active voice
- Double space between scenes
- Keep paragraphs short (2-3 lines max)

## Dialogue
\`\`\`
CHARACTER NAME
(parenthetical - actor direction)
The actual dialogue here.
\`\`\`

## Transitions
\`\`\`
CUT TO:
FADE TO:
DISSOLVE TO:
\`\`\`

## Best Practices
- Sluglines in ALL CAPS
- Character names in ALL CAPS on first introduction
- Avoid camera directions unless critical
- White space is your friend`,
  },

  'dialogue-craft': {
    id: 'dialogue-craft',
    name: 'Dialogue Crafting',
    description: 'Writing natural, character-specific dialogue',
    category: 'writer',
    tags: ['dialogue', 'character', 'voice'],
    tokens: 250,
    content: `# Dialogue Crafting Principles

## Character Voice
- Each character has distinct speech patterns
- Education level affects vocabulary
- Background influences phrasing
- Stress changes how they speak

## Subtext Over Text
- What's NOT said is often more important
- Characters rarely say exactly what they mean
- Conflict should exist in every exchange
- Desires vs. what they actually say

## Natural Flow
- People interrupt each other
- Sentences trail off...
- Use contractions (don't, won't, can't)
- Avoid on-the-nose exposition

## Rhythm and Pacing
- Vary sentence length
- Short lines = tension
- Long lines = reflection or rambling
- Silence speaks volumes

## Common Pitfalls
- ❌ Characters explaining things they both know
- ❌ Perfect grammar in casual conversation
- ❌ Everyone sounds the same
- ❌ Dialogue as info-dump`,
  },

  'visual-storytelling': {
    id: 'visual-storytelling',
    name: 'Visual Storytelling',
    description: 'Show don\'t tell through action and imagery',
    category: 'writer',
    tags: ['visual', 'action', 'cinematography'],
    tokens: 180,
    content: `# Visual Storytelling

## Show Don't Tell
- Character is angry → Character slams door, jaw clenched
- Character is sad → Character stares out window, shoulders slumped
- Trust eroding → Longer pauses before answering

## Visual Hooks
- Every scene should have a memorable image
- Use environment to reflect internal state
- Objects can carry symbolic weight

## Action Writing
- Specific, visceral details
- Active verbs over passive
- Focus on what audience sees/hears
- Less is more - trust the director/actor`,
  },
}

// ============================================
// PLOT ARCHITECT SKILLS
// ============================================

export const PLOT_ARCHITECT_SKILLS: Record<string, Skill> = {
  'beat-structure': {
    id: 'beat-structure',
    name: 'Beat Structure & Story Spine',
    description: 'Story beats and dramatic structure',
    category: 'plot',
    tags: ['beats', 'structure', 'pacing'],
    tokens: 300,
    content: `# Beat Structure & Story Spine

## Essential Beats

### 1. Hook / Opening Image
- Grab attention immediately
- Establish tone and world
- Pose a question

### 2. Inciting Incident
- Disrupts status quo
- Forces protagonist to act
- Usually 10-15% into story

### 3. Rising Action
- Series of escalating complications
- Each beat raises stakes
- Protagonist tries and fails

### 4. Midpoint / Point of No Return
- Major revelation or decision
- Can't go back to old life
- Usually 50% mark

### 5. Crisis / Dark Night
- Lowest point
- All seems lost
- Internal flaw fully exposed

### 6. Climax
- Final confrontation
- Protagonist transformed
- Answer to opening question

### 7. Resolution / New Equilibrium
- Show the change
- Tie up loose ends
- Mirror opening image

## Pacing Guidelines
- Accelerate as you approach climax
- Vary beat length for rhythm
- Give audience breathing room after intensity`,
  },

  'cause-and-effect': {
    id: 'cause-and-effect',
    name: 'Cause and Effect Chains',
    description: 'Building logical story progression',
    category: 'plot',
    tags: ['causality', 'logic', 'progression'],
    tokens: 220,
    content: `# Cause and Effect Chains

## The Golden Rule
Every beat should be a BECAUSE or THEREFORE, never "and then"

## Structure
Beat 1 happens → BECAUSE → Beat 2 happens → THEREFORE → Beat 3 happens

## Bad Example
- Walter cooks meth AND THEN
- Jesse gets addicted AND THEN
- Skyler finds out

## Good Example  
- Walter cooks meth BECAUSE he has cancer and needs money
- Jesse gets involved THEREFORE Walter needs a partner
- Skyler grows suspicious BECAUSE Walter's behavior changes

## Dependencies
- Track what information characters have
- Events must occur in logical order
- Payoffs require setups earlier
- Character changes need catalysts`,
  },

  'setups-payoffs': {
    id: 'setups-payoffs',
    name: 'Setups and Payoffs',
    description: 'Planting and resolving story elements',
    category: 'plot',
    tags: ['setups', 'payoffs', 'foreshadowing'],
    tokens: 180,
    content: `# Setups and Payoffs

## The Rule
If you show a gun in Act 1, it must fire by Act 3.
If it fires in Act 3, we must have seen it in Act 1.

## Types of Setups

### Objects
- Gun on the wall → Used later
- Photo on desk → Becomes important
- Medicine bottle → Reveals condition

### Information
- Casually mentioned skill → Saves the day later
- Overheard conversation → Key clue
- Throwaway line → Major revelation

### Character Traits
- Established fear → Must face it
- Hidden skill → Comes in handy
- Moral line → Will be tested

## Timing
- Setup early, payoff late (maximum impact)
- Multiple setups can have one payoff
- Best payoffs are unexpected yet inevitable`,
  },
}

// ============================================
// CHARACTER PSYCHOLOGY SKILLS
// ============================================

export const CHARACTER_PSYCHOLOGY_SKILLS: Record<string, Skill> = {
  'character-flaws': {
    id: 'character-flaws',
    name: 'Character Flaws & Arcs',
    description: 'Building compelling character transformations',
    category: 'character',
    tags: ['flaws', 'arcs', 'transformation'],
    tokens: 280,
    content: `# Character Flaws & Transformation Arcs

## Fatal Flaw Framework
Every protagonist needs an internal flaw that:
1. Causes their own problems
2. Gets worse under pressure
3. Must be overcome to succeed

## Common Flaws
- **Hubris**: Excessive pride (Walter White)
- **Fear**: Paralyzed by anxiety
- **Mistrust**: Can't rely on others
- **Selfishness**: Only cares about self
- **Denial**: Refuses to see truth

## Transformation Arc
\`\`\`
Start → Flaw exposed → Denial → Crisis → Recognition → Change → New Self
\`\`\`

## Arc Milestones
- **25%**: Flaw visible to audience
- **50%**: Flaw causes major problem
- **75%**: Flaw fully exposed, consequences clear
- **90%**: Overcome flaw or destroy self

## Flat Arcs
Some characters don't change - they change the world around them.
- James Bond, Sherlock Holmes
- Their steadfastness is the point`,
  },

  'psychology-core-needs': {
    id: 'psychology-core-needs',
    name: 'Core Psychological Needs',
    description: 'SDT framework for character motivation',
    category: 'character',
    tags: ['psychology', 'motivation', 'SDT'],
    tokens: 200,
    content: `# Core Psychological Needs (Self-Determination Theory)

## The Three Needs

### 1. Autonomy
- Need for control over own life
- When threatened: Rebellion, escape, assertiveness
- When fulfilled: Confidence, agency, empowerment

### 2. Competence  
- Need to be effective and capable
- When threatened: Anxiety, impostor syndrome, withdrawal
- When fulfilled: Pride, flow state, mastery

### 3. Relatedness
- Need for connection and belonging
- When threatened: Loneliness, jealousy, desperate bonding
- When fulfilled: Security, loyalty, trust

## Story Application
- Identify which need drives each character
- Threaten that need to create conflict
- Character arc = journey to fulfill the need
- Antagonist threatens the need protagonist values most`,
  },

  'emotional-tracking': {
    id: 'emotional-tracking',
    name: 'Emotional State Tracking',
    description: 'Tracking character emotional changes',
    category: 'character',
    tags: ['emotion', 'state', 'metrics'],
    tokens: 150,
    content: `# Emotional State Tracking

## Key Dimensions

### Valence (-100 to +100)
- Negative → Positive
- Sadness → Joy

### Arousal (0 to 100)
- Calm → Excited/Stressed
- Lethargy → Panic

### Social Safety (0 to 100)
- Threatened → Secure
- Isolated → Connected

## Usage
- Track changes scene by scene
- Big swings = dramatic moments
- Plateau = stagnation (boring)
- Recovery periods matter`,
  },
}

// ============================================
// PREMISE ARCHITECT SKILLS
// ============================================

export const PREMISE_ARCHITECT_SKILLS: Record<string, Skill> = {
  'world-building': {
    id: 'world-building',
    name: 'World Building Fundamentals',
    description: 'Creating consistent, compelling worlds',
    category: 'premise',
    tags: ['world', 'rules', 'consistency'],
    tokens: 250,
    content: `# World Building Fundamentals

## Establish Rules Early
- What's possible vs. impossible?
- What are the costs/consequences?
- Who enforces the rules?

## The Iceberg Principle
- Show 10% of your world
- Imply 90% exists beneath
- Don't info-dump

## Internal Consistency
- Rules must be followed consistently
- Exceptions need explanations
- Breaking rules = major story moment

## World Rules Template
\`\`\`
Rule: [What is the rule?]
Consequence: [What happens if broken?]
Exception: [Are there exceptions?]
Story Impact: [How does this create conflict?]
\`\`\`

## Common Pitfalls
- ❌ Too much exposition
- ❌ Convenient rule-breaking
- ❌ Worldbuilding for its own sake
- ✅ Rules that create character conflict`,
  },

  'faction-design': {
    id: 'faction-design',
    name: 'Faction & Power Structure Design',
    description: 'Creating compelling factions and power dynamics',
    category: 'premise',
    tags: ['factions', 'conflict', 'politics'],
    tokens: 200,
    content: `# Faction & Power Structure Design

## Faction Template
- **Name**: Clear identity
- **Ideology**: What they believe
- **Goals**: What they want
- **Methods**: How they operate
- **Leader**: Who's in charge
- **Resources**: What they control
- **Weaknesses**: Their vulnerabilities

## Power Dynamics
- Factions should oppose each other
- Create triangles, not just two sides
- Shifting alliances = drama
- Characters torn between factions

## Conflict Generation
- Competing goals
- Incompatible ideologies
- Resource scarcity
- Personal grudges between leaders`,
  },
}

// ============================================
// EPISODE PREMISE SKILLS
// ============================================

export const EPISODE_PREMISE_SKILLS: Record<string, Skill> = {
  'ozymandias-framework': {
    id: 'ozymandias-framework',
    name: 'Ozymandias Framework',
    description: 'Episode premise design using proven framework',
    category: 'episode_premise',
    tags: ['framework', 'premise', 'structure'],
    tokens: 320,
    content: `# Ozymandias Framework for Episode Premises

## Core Philosophy
Every great episode follows a pattern:
**Flaw → Error → Consequence → Irreversible Change**

## Framework Components

### 1. The Hook (Opening)
- Immediately grabs attention
- Poses a dramatic question
- Shows protagonist's world/status quo

### 2. Protagonist Hook
- Specific to the main character
- Shows their current state
- Hints at the flaw

### 3. Fatal Flaw
- Internal character weakness
- Will cause their downfall
- Audience can see it, character can't

### 4. The Turn (Midpoint)
- Flaw causes a critical error
- Point of no return
- Everything changes here

### 5. Stakes
- What the character stands to lose
- Physical / Professional / Psychological
- Must feel real and severe

### 6. Inevitable Consequence
- Direct result of the flaw
- Could have been avoided
- Feels both surprising and inevitable

### 7. The Aftermath (Resolution)
- World or character is changed forever
- New equilibrium (worse or different)
- Sets up future episodes

### 8. Transformation
- How has the character changed?
- What did they learn (or fail to learn)?
- Are they better or worse?

### 9. Thematic Focus
- One clear theme per episode
- Examples: Hubris, Betrayal, Greed, Pride
- Everything serves the theme

## Example: Breaking Bad "Ozymandias"
- **Hook**: Family in hiding, tense phone call
- **Fatal Flaw**: Walter's pride/ego
- **The Turn**: Hank dies because Walter wouldn't quit
- **Stakes**: Family, freedom, life
- **Consequence**: Family destroyed, everything lost
- **Transformation**: Walter fully becomes Heisenberg
- **Theme**: Pride before the fall`,
  },
}

// ============================================
// DEVILS ADVOCATE SKILLS
// ============================================

export const DEVILS_ADVOCATE_SKILLS: Record<string, Skill> = {
  'plot-hole-detection': {
    id: 'plot-hole-detection',
    name: 'Plot Hole Detection',
    description: 'Finding logic gaps and inconsistencies',
    category: 'review',
    tags: ['critique', 'logic', 'consistency'],
    tokens: 220,
    content: `# Plot Hole Detection Checklist

## Character Knowledge
- ✓ Does character know something they shouldn't?
- ✓ Did they forget something important?
- ✓ Are they making decisions without information?

## Causality
- ✓ Does event A logically lead to event B?
- ✓ Are there gaps in the chain?
- ✓ Could this have been solved more easily?

## Motivation
- ✓ Why is character doing this?
- ✓ Is there an easier way to achieve their goal?
- ✓ Are they acting consistently?

## World Rules
- ✓ Are established rules being followed?
- ✓ Are there convenient exceptions?
- ✓ Do capabilities change arbitrarily?

## Timeline
- ✓ Does timing make sense?
- ✓ Is travel time realistic?
- ✓ Are deadlines consistent?

## The "Because" Test
For every event, ask: "Why did this happen?"
If answer is "Because plot needed it" → FIX IT`,
  },

  'dramaturgical-analysis': {
    id: 'dramaturgical-analysis',
    name: 'Dramaturgical Analysis',
    description: 'Deep critique of dramatic structure',
    category: 'review',
    tags: ['dramaturgy', 'structure', 'critique'],
    tokens: 240,
    content: `# Dramaturgical Analysis

## Conflict Levels
Every scene needs conflict at one or more levels:
- **Internal**: Character vs. Self
- **Interpersonal**: Character vs. Character
- **Social**: Character vs. Society
- **Environmental**: Character vs. Nature/Situation

## Stakes Escalation
- Stakes should rise throughout
- Each beat should be harder than the last
- Setbacks should be meaningful
- Victories should cost something

## Dramatic Irony
- What does audience know that character doesn't?
- What does character know that others don't?
- How can we maximize tension through knowledge gaps?

## Thematic Resonance
- Does every beat serve the theme?
- Are symbols and motifs consistent?
- Does the climax deliver on thematic promise?`,
  },
}

// ============================================
// COMBINED SKILL REGISTRY
// ============================================

export const ALL_SKILLS: Skill[] = [
  ...Object.values(WRITER_SKILLS),
  ...Object.values(PLOT_ARCHITECT_SKILLS),
  ...Object.values(CHARACTER_PSYCHOLOGY_SKILLS),
  ...Object.values(PREMISE_ARCHITECT_SKILLS),
  ...Object.values(EPISODE_PREMISE_SKILLS),
  ...Object.values(DEVILS_ADVOCATE_SKILLS),
]

/**
 * Get skills for a specific agent
 */
export function getSkillsForAgent(agentName: string): Skill[] {
  const agentSkillMap: Record<string, Skill[]> = {
    writer: Object.values(WRITER_SKILLS),
    plot_architect: Object.values(PLOT_ARCHITECT_SKILLS),
    character_psychology: Object.values(CHARACTER_PSYCHOLOGY_SKILLS),
    premise_architect: Object.values(PREMISE_ARCHITECT_SKILLS),
    episode_premise_architect: Object.values(EPISODE_PREMISE_SKILLS),
    devils_advocate: Object.values(DEVILS_ADVOCATE_SKILLS),
  }

  return agentSkillMap[agentName] || []
}

/**
 * Get recommended skills for a task type
 */
export function getRecommendedSkills(taskType: string): Skill[] {
  const recommendations: Record<string, string[]> = {
    write_script: ['script-format', 'dialogue-craft', 'visual-storytelling'],
    write_dialogue: ['dialogue-craft'],
    create_beat: ['beat-structure', 'cause-and-effect'],
    design_character: ['character-flaws', 'psychology-core-needs'],
    review_plot: ['plot-hole-detection', 'cause-and-effect'],
    build_world: ['world-building', 'faction-design'],
    design_episode: ['ozymandias-framework', 'beat-structure'],
  }

  const skillIds = recommendations[taskType] || []
  return ALL_SKILLS.filter(skill => skillIds.includes(skill.id))
}
