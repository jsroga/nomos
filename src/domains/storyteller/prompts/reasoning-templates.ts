/**
 * Structured Chain-of-Thought Reasoning Templates
 * 
 * Provides structured reasoning frameworks for agents to ensure
 * transparent, traceable decision-making.
 */

// ============================================
// BASE REASONING TEMPLATE
// ============================================

export const STRUCTURED_REASONING_TEMPLATE = `
## Reasoning Process

### 1. UNDERSTAND
- What is the user asking for?
- What context is relevant?
- What constraints apply?

### 2. RETRIEVE
- What information do I need from the series bible?
- What past decisions are relevant?
- What user preferences should I consider?

### 3. REASON
- What are the options?
- What are the tradeoffs?
- What aligns with established rules?
- What risks exist?

### 4. DECIDE
- What action will I take?
- What is my confidence level?
- What could go wrong?

### 5. RESPOND
- Clear explanation of decision
- Next steps for the user
- Any caveats or alternatives
`

// ============================================
// AGENT-SPECIFIC TEMPLATES
// ============================================

export const SUPERVISOR_REASONING = `
## Supervisor Reasoning Framework

### ANALYZE REQUEST
1. What is the primary intent? (create/modify/review/query)
2. Which phase is the project in? (premise/outline/script)
3. What entities are mentioned? (characters/scenes/episodes/beats)

### SELECT AGENT
Based on analysis, route to:
- PremiseArchitect: World-building, rules, character creation
- PlotArchitect: Story structure, episode arcs, beat sequences  
- Writer: Dialogue, scene writing, script generation
- CharacterPsychology: Character motivation, voice, consistency
- DevilsAdvocate: Critical review, plot hole detection
- ConsequenceTracker: Continuity, ripple effects

### DELEGATION RULES
- Never delegate meta-questions about the system
- Delegate creative work, keep coordination
- If unclear, ask clarifying questions first
- If dangerous (deletes data), require confirmation
`

export const PLOT_ARCHITECT_REASONING = `
## Plot Architect Reasoning Framework

### STORY ANALYSIS
1. Where are we in the story structure?
   - Setup (Act 1): Establish world, characters, stakes
   - Confrontation (Act 2): Rising action, obstacles, development
   - Resolution (Act 3): Climax, resolution, denouement

2. What is the current dramatic tension?
   - Stakes: What could be lost?
   - Urgency: Why now?
   - Obstacles: What stands in the way?

### BEAT EVALUATION
For each proposed beat, assess:
- **Causality**: Does it logically follow from previous beats?
- **Character Agency**: Are characters driving the action?
- **Stakes Evolution**: Do stakes increase or transform?
- **Surprise vs Setup**: Does it pay off or plant seeds?

### CREATIVE CHOICES
- Avoid predictable patterns (don't always escalate)
- Subvert expectations when earned
- Balance setup and payoff
- Consider pacing rhythm
`

export const WRITER_REASONING = `
## Writer Reasoning Framework

### SCENE ANALYSIS
Before writing:
1. What is the scene's PURPOSE? (reveal, conflict, development)
2. Who are the POV characters?
3. What emotional journey does the audience take?
4. What information must be conveyed?

### DIALOGUE CRAFT
For each line:
- Does it sound like THIS character?
- Is there subtext (what's NOT said)?
- Does it advance the scene?
- Is it doing double-duty (character + plot)?

### ANTI-SLOP CHECKLIST
Avoid:
- [ ] Generic emotional descriptions (heart pounded, tears streaming)
- [ ] Exposition dumps ("As you know, Bob...")
- [ ] Formulaic transitions ("Little did they know...")
- [ ] On-the-nose dialogue
- [ ] Overwritten action beats (nodded, sighed, shrugged)

Instead:
- [ ] Specific, surprising details
- [ ] Show emotions through behavior
- [ ] Subtext-laden dialogue
- [ ] Unexpected but earned moments
`

export const CHARACTER_PSYCHOLOGY_REASONING = `
## Character Psychology Reasoning Framework

### CHARACTER ASSESSMENT
For each character in scene:
1. What do they WANT (conscious goal)?
2. What do they NEED (unconscious need)?
3. What is their WOUND (backstory trauma)?
4. What is their FLAW (character defect)?
5. What is their MASK (how they present)?

### MOTIVATION CHECK
Every action should trace back to:
- Immediate goal
- Episode arc goal
- Season arc goal
- Core character need

### VOICE CONSISTENCY
Check against character profile:
- Speech patterns (formal/casual, verbose/terse)
- Vocabulary level
- Emotional expression style
- Relationship dynamics (how they speak to different characters)

### GROWTH TRACKING
- Where are they in their arc?
- What has changed since last scene?
- What trigger could cause growth/regression?
`

export const DEVILS_ADVOCATE_REASONING = `
## Devil's Advocate Reasoning Framework

### CRITICAL ANALYSIS
Challenge the content on:

1. **Logic**: Does this make sense within the story's rules?
2. **Character**: Would this character really do/say this?
3. **Stakes**: Are consequences proportional to actions?
4. **Originality**: Is this clichéd or fresh?
5. **Pacing**: Does this scene earn its length?

### PLOT HOLE DETECTION
Check for:
- Timeline inconsistencies
- Character knowledge violations (knowing things they shouldn't)
- Rule violations (breaking established world rules)
- Motivation gaps (actions without clear reasons)
- Resolution cheats (deus ex machina)

### CONSTRUCTIVE CRITICISM FORMAT
For each issue:
1. STATE the problem clearly
2. CITE the specific passage
3. EXPLAIN why it's problematic
4. SUGGEST at least one fix

### SEVERITY RATINGS
- CRITICAL: Breaks story logic, must fix
- MAJOR: Weakens story significantly
- MINOR: Polish issue, nice to fix
- SUGGESTION: Optional enhancement
`

export const PREMISE_ARCHITECT_REASONING = `
## Premise Architect Reasoning Framework

### WORLD-BUILDING PRINCIPLES
1. **Internal Consistency**: Rules must work together
2. **Meaningful Constraints**: Limitations drive drama
3. **Discovery Space**: Leave room for exploration
4. **Grounded Fantasy**: Even magic has rules

### NEW RULE EVALUATION
Before adding a rule:
- Does it contradict existing rules?
- Does it create interesting dramatic possibilities?
- Is it specific enough to be meaningful?
- Is it general enough to apply broadly?

### CHARACTER CREATION CHECKLIST
New characters need:
- [ ] Clear role in story
- [ ] Unique voice/perspective
- [ ] Relationship to existing characters
- [ ] Internal contradiction (flaw + strength)
- [ ] Arc potential

### CONSISTENCY CHECK
When modifying world:
- List all entities affected
- Check for ripple effects
- Update series bible
- Flag potential plot holes
`

// ============================================
// REASONING INJECTION HELPER
// ============================================

export interface ReasoningContext {
  agentRole: string
  projectPhase: 'premise' | 'outline' | 'script'
  existingContext?: string
}

/**
 * Get the appropriate reasoning template for an agent
 */
export function getReasoningTemplate(agentRole: string): string {
  const templates: Record<string, string> = {
    showrunner: SUPERVISOR_REASONING,
    supervisor: SUPERVISOR_REASONING,
    plotArchitect: PLOT_ARCHITECT_REASONING,
    writer: WRITER_REASONING,
    characterPsychology: CHARACTER_PSYCHOLOGY_REASONING,
    devilsAdvocate: DEVILS_ADVOCATE_REASONING,
    premiseArchitect: PREMISE_ARCHITECT_REASONING,
  }
  
  return templates[agentRole] || STRUCTURED_REASONING_TEMPLATE
}

/**
 * Create a full system prompt with reasoning template
 */
export function createAgentPromptWithReasoning(
  agentRole: string,
  basePrompt: string,
  context?: ReasoningContext
): string {
  const reasoningTemplate = getReasoningTemplate(agentRole)
  
  return `${basePrompt}

---

${reasoningTemplate}

---

When responding, structure your thinking according to the framework above.
Be explicit about your reasoning process.
`
}

// ============================================
// REASONING VALIDATION
// ============================================

/**
 * Check if a response shows explicit reasoning
 */
export function hasExplicitReasoning(response: string): {
  hasReasoning: boolean
  sections: string[]
  score: number
} {
  const reasoningMarkers = [
    'understand', 'analyze', 'assess',
    'reason', 'consider', 'evaluate',
    'decide', 'conclude', 'determine',
    'because', 'therefore', 'since',
    'option', 'alternative', 'tradeoff',
  ]
  
  const responseLower = response.toLowerCase()
  const foundMarkers = reasoningMarkers.filter(m => responseLower.includes(m))
  
  const sections: string[] = []
  if (/understand|analyze|what .* asking/i.test(response)) sections.push('understanding')
  if (/consider|option|alternative/i.test(response)) sections.push('options')
  if (/because|since|therefore/i.test(response)) sections.push('justification')
  if (/decide|conclude|will/i.test(response)) sections.push('decision')
  
  return {
    hasReasoning: foundMarkers.length >= 3,
    sections,
    score: Math.min(1, foundMarkers.length / 5),
  }
}

