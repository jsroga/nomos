/**
 * Extended Thinking Framework for Storyteller (v2)
 *
 * Simplified, action-oriented framework that focuses on CREATIVE OUTPUT
 * rather than exhaustive analysis checklists.
 *
 * Key changes from v1:
 * - Fewer analysis steps (3 instead of 5)
 * - More positive guidance (what TO do)
 * - Stronger creative examples
 * - Less cognitive overhead
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
   - Walter White: Family man who becomes a monster
   - Every character should have at least ONE contradiction

3. **SUBTEXT is everything**
   - The best dialogue does TRIPLE DUTY:
     * Surface meaning (what they say)
     * Emotional truth (what they feel)
     * Hidden agenda (what they want)

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
// EXTENDED THINKING FRAMEWORK (Simplified)
// ============================================

export const EXTENDED_THINKING_FRAMEWORK = `
## Quick Story Check (Do This FAST, Then WRITE)

Before writing, answer these THREE questions in <thinking> tags:

<thinking>
1. **WHO WANTS WHAT?**
   - Character A wants: ___
   - Character B wants: ___
   - These wants CONFLICT because: ___

2. **WHAT CHANGES?**
   - Before this scene: ___
   - After this scene: ___
   - The change MATTERS because: ___

3. **ONE SPECIFIC DETAIL**
   - What unexpected, SPECIFIC detail will make this feel real?
   - (A nervous habit? A distinctive voice pattern? A visual anchor?)
</thinking>

Now WRITE with confidence. Let the characters surprise you.
`

// ============================================
// AGENT-SPECIFIC FRAMEWORKS (Streamlined)
// ============================================

export const WRITER_THINKING_FRAMEWORK = `
${EXTENDED_THINKING_FRAMEWORK}

### Writer Focus: SCENE CRAFT

<thinking>
**DIALOGUE CHECK**
- Can you HEAR each character's voice distinctly?
- What are they NOT saying? (That's often more important)
- What's the POWER move in this exchange?

**VISUAL ANCHOR**
Think like a DP on Breaking Bad:
- What's the establishing shot?
- Where does silence speak louder than words?
- What object/detail carries symbolic weight?
</thinking>

Write the scene. Trust your instincts. Specificity is your friend.
`

export const PLOT_ARCHITECT_THINKING_FRAMEWORK = `
${EXTENDED_THINKING_FRAMEWORK}

### Plot Architect Focus: STRUCTURE

<thinking>
**THE SURPRISE TEST**
- What does the audience EXPECT?
- What would be SURPRISING but feel INEVITABLE in hindsight?
- What choice has the BIGGEST CONSEQUENCES?

**SETUP/PAYOFF AUDIT**
- What previous setups am I paying off here?
- What new questions am I creating?
</thinking>

Design beats that EARN their twists.
`

export const CHARACTER_PSYCHOLOGY_THINKING_FRAMEWORK = `
${EXTENDED_THINKING_FRAMEWORK}

### Character Focus: COMPLEXITY

<thinking>
**THE CONTRADICTION**
Every memorable character has ONE defining contradiction:
- Tyrion: Brilliant + Self-destructive
- Cersei: Ruthless + Loves her children absolutely
- Walt: Family man + Egomaniac

What is THIS character's defining contradiction?

**THE LINE THEY WON'T CROSS... UNTIL THEY DO**
- What would this character NEVER do?
- What circumstance would make them do it anyway?
</thinking>

Create characters that surprise themselves.
`

export const DEVILS_ADVOCATE_THINKING_FRAMEWORK = `
${EXTENDED_THINKING_FRAMEWORK}

### Devil's Advocate Focus: TRUTH-TELLING

<thinking>
**WHERE IS THIS WEAK?**
- Where is the story taking the EASY path?
- What would a HOSTILE critic attack?
- Is anything CONVENIENT rather than EARNED?

**THE RED WEDDING STANDARD**
That moment worked because:
- Setup was there (Frey's character, broken vow)
- Consequences were massive
- It was SURPRISING but INEVITABLE

Does this story earn its moments?
</thinking>

Be merciless. The story will be stronger.
`

// ============================================
// SELF-CRITIQUE PROMPTS (Simplified)
// ============================================

export const SELF_CRITIQUE_PROMPT = `
You are a story editor with HBO standards. Be brief and specific.

## Draft to Critique:
{{draft}}

## Context:
{{context}}

Respond with JSON:
{
  "score": 0-100,
  "strengths": ["max 2 specific things that work"],
  "weaknesses": ["max 2 specific things that don't"],
  "oneFixThatMatters": "The single most important improvement",
  "shouldRevise": boolean
}
`

// ============================================
// CREATIVE EXAMPLES (NEW - Positive Guidance)
// ============================================

export const CREATIVE_EXAMPLES = `
## Examples of GOOD vs BAD

### EMOTION - Show Through Action
BAD: "She felt a wave of sadness wash over her."
GOOD: "She picked up his coffee mug. Still half full. She drank it cold."

### DIALOGUE - Subtext Over Exposition
BAD: "I'm angry because you lied to me about the money!"
GOOD: "You want to tell me again how much a gallon of milk costs?"

### CHARACTER - Contradiction Creates Depth
BAD: "The villain laughed menacingly."
GOOD: "He kissed his daughter's forehead, checked his watch, then gave the order."

### TENSION - Specificity Over Cliché
BAD: "The tension was palpable. Hearts raced."
GOOD: "Nobody moved. The ice cubes settled in her glass."
`

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if extended thinking is enabled
 */
export function isExtendedThinkingEnabled(): boolean {
  return process.env.STORYTELLER_EXTENDED_THINKING === 'true'
}

/**
 * Get the appropriate thinking framework for an agent
 */
export function getThinkingFramework(agentKey: string): string {
  if (!isExtendedThinkingEnabled()) {
    return ''
  }

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
export function getQualityStandards(): string {
  if (!isExtendedThinkingEnabled()) {
    return ''
  }
  return GRRM_GILLIGAN_STANDARDS
}

/**
 * Get creative examples for positive guidance
 */
export function getCreativeExamples(): string {
  if (!isExtendedThinkingEnabled()) {
    return ''
  }
  return CREATIVE_EXAMPLES
}

/**
 * Wrap content with thinking tags instruction
 */
export function wrapWithThinkingInstruction(content: string): string {
  return `
Structure your response:
1. Brief analysis in <thinking> tags (keep it SHORT)
2. Your creative output in <output> tags

${content}

The <thinking> section should be QUICK - then WRITE.
`
}
