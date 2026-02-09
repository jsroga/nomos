/**
 * Extended Thinking Framework for Storyteller (v2 - Efficient)
 *
 * Compact, high-impact framework designed to balance narrative quality
 * with token efficiency. Focuses on the "Theory of Mind" elements that
 * drive character depth without burning tokens on obvious checks.
 */

// ============================================
// GRRM / GILLIGAN QUALITY STANDARDS (Simplified)
// ============================================

export const GRRM_GILLIGAN_STANDARDS = `
## Prestige TV Writing: The Gold Standard

### WHAT MAKES WRITING MEMORABLE
1. **SPECIFIC beats GENERIC every time**
   - BAD: "His heart pounded with fear"
   - GOOD: "He counted the tiles on the floor, fourteen, fifteen, sixteen..."

2. **CHARACTER = CONTRADICTION**
   - Tyrion: Brilliant mind, desperate for love, self-destructive
   - Every character should have at least ONE contradiction

3. **SUBTEXT is everything**
   - The best dialogue does TRIPLE DUTY: Surface meaning + Emotional truth + Hidden agenda

4. **CHANGE is mandatory**
   - Every scene must have a BEFORE and AFTER
   - Something shifts: knowledge, relationship, power, stakes

5. **EARN your moments**
   - Setup → Payoff (no coincidences)
   - Consequences that ripple forward

### FORBIDDEN (Instant Quality Kills)
- Generic emotional descriptors
- Villain exposition dumps
- Convenient timing
- Characters stating their feelings
`

// ============================================
// EXTENDED THINKING FRAMEWORK (Compact)
// ============================================

export const EXTENDED_THINKING_FRAMEWORK = `
## Quick Story Check (Token Efficient)

Before writing, answer these THREE questions in <thinking> tags. 
KEEP IT BRIEF (max 2 sentences per point).

<thinking>
1. **THEORY OF MIND (Subtext)**
   - What is the character HIDING or lying about (even to themselves)?
   - What is the unspoken power dynamic?

2. **STATE CHANGE (Necessity)**
   - What specific value changes by the end? (e.g., Hope -> Despair, Safety -> Danger)
   - If nothing changes, the scene is filler.

3. **ONE SPECIFIC DETAIL (Reality)**
   - Name ONE unexpected, specific physical detail that anchors the scene in reality.
   - (e.g., The sound of a ticking clock, a specific smell, a nervous tic)
</thinking>

Now WRITE. Let the specific detail and hidden agenda drive the scene.
`

// ============================================
// AGENT-SPECIFIC FRAMEWORKS (Streamlined)
// ============================================

export const WRITER_THINKING_FRAMEWORK = `
${EXTENDED_THINKING_FRAMEWORK}

### Writer Extra: VOICE
In <thinking>, add:
4. **VOICE CHECK**: Does this sound like ANYONE could say it? If yes, rewrite it.
`

export const PLOT_ARCHITECT_THINKING_FRAMEWORK = `
${EXTENDED_THINKING_FRAMEWORK}

### Plot Architect Extra: CONSEQUENCE
In <thinking>, add:
4. **RIPPLE EFFECT**: What future event does this enable/block?
`

export const CHARACTER_PSYCHOLOGY_THINKING_FRAMEWORK = `
${EXTENDED_THINKING_FRAMEWORK}

### Psychologist Extra: CONTRADICTION
In <thinking>, add:
4. **THE FLIP**: How does their action contradict their stated belief?
`

export const DEVILS_ADVOCATE_THINKING_FRAMEWORK = `
${EXTENDED_THINKING_FRAMEWORK}

### Devil's Advocate Extra: TRUTH
In <thinking>, add:
4. **THE LIE**: What is the comfortable lie this story is telling? Break it.
`

// ============================================
// SELF-CRITIQUE PROMPTS (Simplified)
// ============================================

export const SELF_CRITIQUE_PROMPT = `
You are a story editor. Be brief.

## Draft to Critique:
{{draft}}

## Context:
{{context}}

Respond with JSON:
{
  "score": 0-100,
  "issue": "The single biggest issue (if any)",
  "fix": "Specific way to fix it",
  "shouldRevise": boolean
}
`

// ============================================
// CREATIVE EXAMPLES (Positive Guidance)
// ============================================

export const CREATIVE_EXAMPLES = `
## Examples
### SUBTEXT
BAD: "I'm angry you lied."
GOOD: "You want to tell me again how much a gallon of milk costs?"

### DETAIL
BAD: "The room was messy."
GOOD: "A half-eaten sandwich sat on a stack of unpaid bills."
`

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if extended thinking is enabled
 */
function isExtendedThinkingEnabled(): boolean {
  // Always true for v2 agents to ensure quality
  return true
}

/**
 * Get the appropriate thinking framework for an agent
 */
export function getThinkingFramework(agentKey: string): string {
  switch (agentKey) {
    case 'writer':
      return WRITER_THINKING_FRAMEWORK
    case 'plotArchitect':
    case 'plot_architect':
      return PLOT_ARCHITECT_THINKING_FRAMEWORK
    case 'characterPsychology':
    case 'character_psychology':
      return CHARACTER_PSYCHOLOGY_THINKING_FRAMEWORK
    case 'devilsAdvocate':
    case 'devils_advocate':
      return DEVILS_ADVOCATE_THINKING_FRAMEWORK
    default:
      return EXTENDED_THINKING_FRAMEWORK
  }
}

/**
 * Get GRRM/Gilligan quality standards
 */
function getQualityStandards(): string {
  return GRRM_GILLIGAN_STANDARDS
}

/**
 * Get creative examples for positive guidance
 */
function getCreativeExamples(): string {
  return CREATIVE_EXAMPLES
}

/**
 * Wrap content with thinking tags instruction
 */
export function wrapWithThinkingInstruction(content: string): string {
  return `
Structure your response:
1. Brief <thinking> analysis (Keep it short!)
2. <output> content

${content}
`
}
