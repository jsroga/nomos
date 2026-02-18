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
// AI SLOP BLOCKLIST - Banned Phrases & Patterns
// ============================================

export const AI_SLOP_BLOCKLIST = `
## AI SLOP BLOCKLIST — NEVER USE THESE

### Banned Phrases (if you catch yourself writing these, DELETE and rewrite)
- "It's worth noting that..."
- "It's important to remember..."
- "Interestingly enough..."
- "In a world where..."
- "Little did they know..."
- "A testament to..."
- "The weight of [emotion] settled over..."
- "This speaks to the broader theme of..."
- "A tapestry of..."
- "Navigate the complexities of..."
- "Embark on a journey..."
- "A unique perspective..."
- "Delve into..."
- "Myriad of..."
- "Resonated with..."
- "Landscape of..."
- "Unveiling..."
- "The key is..."
- "It should be noted..."
- "In many ways..."

### Banned Emotion Shortcuts (show the behavior, not the label)
- BAD: "She felt a surge of anger" → GOOD: "She set her glass down hard enough to crack the stem"
- BAD: "He was overwhelmed with grief" → GOOD: "He opened the fridge, stared at it, closed it, opened it again"
- BAD: "Fear gripped her heart" → GOOD: "She locked the car doors twice, then checked them a third time"
- BAD: "He was consumed by guilt" → GOOD: "He left a forty-dollar tip on a twelve-dollar meal"
- BAD: "A chill ran down her spine" → GOOD: "She pulled her jacket tighter and changed her route"
- BAD: "His blood ran cold" → GOOD: "He stopped mid-sentence and forgot what he was saying"
- BAD: "Tears of joy streamed down her face" → GOOD: "She laughed so hard she had to sit down on the curb"
- BAD: "Tension was palpable" → GOOD: "Nobody reached for the bread basket"

### Banned Purple Prose
- "orbs" (for eyes), "crimson liquid" (for blood), "obsidian locks" (for hair)
- "porcelain skin", "alabaster", "pools of [color] eyes"
- Any body part described with a gemstone or mineral

### Banned Exposition Patterns
- Character explains their own motivation out loud
- "As you know, Bob..." (characters telling each other things they already know)
- Villains explaining their plan before executing it
- Narrator summarizing what just happened
- Characters narrating their own feelings: "I guess I'm just scared of..."

### Banned Plot Conveniences
- "Just in time" / "At the last moment"
- "Miraculously" / "Conveniently" / "As luck would have it"
- Characters bumping into exactly who they need by accident
- A new ability or resource appearing exactly when needed
`

// ============================================
// EXTENDED THINKING FRAMEWORK (Compact)
// ============================================

export const EXTENDED_THINKING_FRAMEWORK = `
## Quick Story Check (Token Efficient)

Before writing, answer these FOUR questions in <thinking> tags.
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

4. **SLOP CHECK (Authenticity)**
   - Am I about to use any banned phrase from the AI Slop Blocklist?
   - Am I TELLING an emotion instead of SHOWING a behavior?
   - Does any sentence sound like "anyone could have written this"? If yes, cut it.
</thinking>

Now WRITE. Let the specific detail and hidden agenda drive the scene.

${AI_SLOP_BLOCKLIST}
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

BAD: "I don't trust you anymore."
GOOD: "I changed the locks. The new key is under the mat if you need anything from the garage."

### DETAIL
BAD: "The room was messy."
GOOD: "A half-eaten sandwich sat on a stack of unpaid bills."

BAD: "The city was dangerous at night."
GOOD: "The streetlight on Broad had been out for six weeks. Nobody filed a report."

### CHARACTER VOICE (each character must sound DIFFERENT)
BAD: "I believe we should consider the implications of this decision carefully."
BAD: "We need to think about what this means for all of us."
(These sound identical. No voice. No person.)

GOOD (military): "We move at 0400. Questions?"
GOOD (academic): "The historical precedent suggests—well, you wouldn't want to hear about the Peloponnesian parallel."
GOOD (street): "That's a Tuesday problem. I got Monday problems."

### EXPOSITION (never have characters explain things they already know)
BAD: "As you know, Marcus, our faction has been at war with the Syndicate for three years."
GOOD: "Three years." Marcus traced the scar on his forearm. "Three years and we still can't hold the east side."

### TRANSFORMATION (show the before/after in behavior, not narration)
BAD: "After the battle, she was a changed woman. She had learned the true cost of war."
GOOD: "She used to name her arrows. After the battle, she stopped naming things."
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
