/**
 * Writing Laws Context
 *
 * Combines Lech Mazur's benchmark elements with the Gilligan Method
 * for crafting compelling, character-driven stories.
 */

export const MAZUR_BENCHMARK = {
  elements: [
    {
      name: 'Character',
      description:
        'Deepen specific traits, contradictions, and blind spots. No one is all good or all evil.',
      prompt:
        'What character trait is revealed or tested in this beat? What contradiction exists within them?',
    },
    {
      name: 'Object',
      description: 'Use physical props that anchor the scene and carry symbolic weight.',
      prompt: 'What physical object is present? What does it represent to the character?',
    },
    {
      name: 'Core Concept',
      description: 'Every scene must reinforce the central theme of the story.',
      prompt: "How does this beat connect to the story's central question or theme?",
    },
    {
      name: 'Attribute',
      description: 'Include one specific sensory detail that makes the scene tangible.',
      prompt: 'What do we see, hear, smell, taste, or feel? Be specific.',
    },
    {
      name: 'Action',
      description: "Use active verbs and distinct physical movement. Show, don't tell.",
      prompt: 'What is the character physically DOING? Use a specific, active verb.',
    },
    {
      name: 'Method',
      description: 'HOW they do something reveals WHO they are. The manner matters.',
      prompt: 'How does the character perform this action? What does their method reveal?',
    },
    {
      name: 'Setting',
      description: 'Environment as character. The space reflects internal state.',
      prompt:
        "Where does this take place? How does the environment mirror the character's psychology?",
    },
    {
      name: 'Timeframe',
      description: 'Specific time pressure creates urgency. Be precise about duration.',
      prompt: 'What is the time constraint? How much time does the character have?',
    },
    {
      name: 'Motivation',
      description: "Clear 'Why' behind every action. What does the character WANT?",
      prompt: "What does the character want in this moment? What's driving them?",
    },
    {
      name: 'Tone',
      description: 'Consistent atmosphere with earned tonal shifts.',
      prompt: 'What is the emotional tone? Does any shift feel earned by previous beats?',
    },
  ],

  toPrompt(): string {
    return `
LECH MAZUR BENCHMARK - Every beat must address these 10 elements:

${this.elements
  .map(
    (e, i) => `${i + 1}. ${e.name}: ${e.description}
   Ask: ${e.prompt}`
  )
  .join('\n\n')}

A beat that lacks any of these elements is incomplete.
`
  },
}

export const GILLIGAN_METHOD = {
  principles: [
    {
      name: "Where's Their Head At?",
      description: 'Before any character acts, understand their complete psychological state.',
      questions: [
        'What do they believe about themselves right now?',
        'What are they afraid others will discover?',
        'What lie are they telling themselves?',
        'What do they actually want vs what they say they want?',
      ],
    },
    {
      name: 'Is This Earned?',
      description: 'Every beat must have causal setup. Nothing happens without groundwork.',
      questions: [
        'What previous beat sets up this moment?',
        'Would the audience be surprised OR confused? (Surprise good, confusion bad)',
        'Can you trace the logical chain from inciting incident to here?',
      ],
    },
    {
      name: 'Mystery vs Confusion',
      description:
        "Mystery is good—the audience knows something is hidden. Confusion is bad—they can't follow causality.",
      questions: [
        "Is the audience asking 'what will happen?' (good) or 'what is happening?' (bad)",
        'Are we withholding information for suspense, or have we failed to communicate?',
      ],
    },
    {
      name: 'No One Sees Themselves As The Villain',
      description:
        'Every character justifies their actions to themselves. Villains are heroes of their own story.',
      questions: [
        "How does this character justify what they're doing?",
        'What would they say if confronted about their actions?',
        "What's the 'good reason' they tell themselves?",
      ],
    },
    {
      name: "What's The First Thing We See?",
      description: 'Every scene needs a visual hook—an image that captures the essence.',
      questions: [
        'What single image summarizes this beat?',
        'Is it memorable? Would it make a good poster?',
        'Does it tell us something about character or theme without dialogue?',
      ],
    },
    {
      name: 'Consequences Are King',
      description: 'Actions have consequences. Characters who should die, die. No plot armor.',
      questions: [
        'What are the realistic consequences of this action?',
        'Are we protecting a character from earned consequences?',
        'How does this ripple forward into future beats?',
      ],
    },
  ],

  toPrompt(): string {
    return `
GILLIGAN METHOD PRINCIPLES - The Breaking Bad Writers Room Approach:

${this.principles
  .map(
    p => `## ${p.name}
${p.description}

Questions to ask:
${p.questions.map(q => `- ${q}`).join('\n')}`
  )
  .join('\n\n')}
`
  },
}

export const MARTIN_STORYTELLING = {
  principles: [
    {
      name: 'Characters Over Plot',
      description: 'Plot emerges from character decisions. Never force characters to serve plot.',
    },
    {
      name: 'Cost of Magic/Power',
      description: 'Every power or ability has a cost. Nothing is free.',
    },
    {
      name: 'The Unexpected Is Earned',
      description:
        "Shocking moments work because they were set up. Ned Stark's death was earned by his honor.",
    },
    {
      name: 'Multiple Perspectives',
      description: 'Show events from different viewpoints. Truth is subjective.',
    },
    {
      name: 'No Black and White',
      description: 'Morality is complex. The most interesting characters exist in grey areas.',
    },
  ],

  toPrompt(): string {
    return `
GEORGE R.R. MARTIN STORYTELLING PRINCIPLES:

${this.principles.map(p => `- ${p.name}: ${p.description}`).join('\n')}
`
  },
}

// Combined context for agents
export function getWritingLawsContext(): string {
  return `
=== WRITING CRAFT GUIDELINES ===

${MAZUR_BENCHMARK.toPrompt()}

${GILLIGAN_METHOD.toPrompt()}

${MARTIN_STORYTELLING.toPrompt()}

=== END GUIDELINES ===
`
}

// Checklist for evaluating beats
export function getBeatEvaluationChecklist(): string {
  return `
BEAT EVALUATION CHECKLIST:

□ Character trait revealed/tested?
□ Physical object present?
□ Theme reinforced?
□ Sensory detail included?
□ Active verb used?
□ Method reveals character?
□ Setting reflects psychology?
□ Time pressure established?
□ Clear motivation?
□ Tone consistent/shift earned?

□ Character psychology validated?
□ Causally earned by previous beats?
□ Mystery not confusion?
□ Self-justification present?
□ Visual hook identified?
□ Consequences acknowledged?

A beat missing 3+ elements should be REVISION_NEEDED.
A beat missing 5+ elements should be REJECTED.
`
}
