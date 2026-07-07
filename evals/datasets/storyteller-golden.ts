/**
 * Storyteller golden dataset — trimmed for Mastra scorers.
 *
 * Each example includes a referenceOutput to score (no live agent call).
 * Fields align with storyteller scorers: facts, canon, persona.
 */

import type { DatasetConfig, EvaluationExample } from '../types'

export type ScorerId = 'magic' | 'consistency' | 'hallucination' | 'persona-fidelity'

export interface StorytellerGoldenExample {
  id: string
  input: {
    message: string
    phase?: string
    /** Consistency scorer — established facts */
    facts?: string[]
    /** Hallucination scorer — series bible / canon */
    canon?: string
    /** Persona fidelity scorer */
    persona?: string
  }
  /** Prose to evaluate (stand-in for agent output until live eval is wired) */
  referenceOutput: string
  metadata: {
    category: 'magic' | 'consistency' | 'hallucination' | 'persona'
    description: string
    /** When set, only these scorers run for this example */
    scorers: ScorerId[]
  }
}

const examples: StorytellerGoldenExample[] = [
  // --- MAGIC ---
  {
    id: 'magic-strong-01',
    input: {
      message: 'Write a tense negotiation scene in a throne room',
      phase: 'writing',
    },
    referenceOutput: `The envoy set the treaty on the table but kept one finger on the seal.
"Your brother signed this," she said, "before he learned what the river really costs."
Kael did not look at the parchment. He watched her left hand — the one that trembled only when she lied.`,
    metadata: {
      category: 'magic',
      description: 'Specific voices, subtext, no AI slop',
      scorers: ['magic'],
    },
  },
  {
    id: 'magic-slop-01',
    input: {
      message: 'Write an epic fantasy battle',
      phase: 'writing',
    },
    referenceOutput: 'In a world where darkness loomed on the horizon, the brave hero stood tall against the vast expanse of evil. It is worth noting that the myriad of warriors clashed in a profound dance of destiny. The intricate tapestry of fate wove itself through the annals of time.',
    metadata: {
      category: 'magic',
      description: 'Classic AI slop patterns — should score low',
      scorers: ['magic'],
    },
  },
  {
    id: 'magic-mid-01',
    input: {
      message: 'Two siblings argue about selling the family farm',
      phase: 'writing',
    },
    referenceOutput: `"You always do this," Mara said, not looking up from the ledger.
"Do what?"
"Make it sound like the land is the only thing that ever mattered."
The wind rattled the screen door. Neither of them moved to fix it.`,
    metadata: {
      category: 'magic',
      description: 'Competent scene with some specificity',
      scorers: ['magic'],
    },
  },

  // --- CONSISTENCY (heuristic: dead vs alive) ---
  {
    id: 'consist-pass-01',
    input: {
      message: 'Describe what the council knows about Lord Venn',
      facts: ['Lord Venn was killed at the harbor three days ago', 'The council declared him dead publicly'],
    },
    referenceOutput: 'The council\'s record is clear: Lord Venn died at the harbor. No envoy has been sent to his estates; the succession writ names his niece as heir.',
    metadata: {
      category: 'consistency',
      description: 'Output respects established death',
      scorers: ['consistency'],
    },
  },
  {
    id: 'consist-fail-01',
    input: {
      message: 'Who attended the morning briefing?',
      facts: ['Lord Venn is dead', 'Only living council members attend briefings'],
    },
    referenceOutput: 'Lord Venn arrived early, alive and impatient, demanding the harbor report before anyone else could speak.',
    metadata: {
      category: 'consistency',
      description: 'Dead character described as alive — should fail',
      scorers: ['consistency'],
    },
  },
  {
    id: 'consist-pass-02',
    input: {
      message: 'Summarize the siege timeline',
      facts: ['The siege ended last winter', 'The gates were opened by treaty, not assault'],
    },
    referenceOutput: 'The siege ended last winter when the treaty opened the gates. No assault breached the walls.',
    metadata: {
      category: 'consistency',
      description: 'No alive/dead conflict — should pass',
      scorers: ['consistency'],
    },
  },

  // --- HALLUCINATION (canon grounding) ---
  {
    id: 'halluc-grounded-01',
    input: {
      message: 'What are the rules of magic in this world?',
      canon: 'Magic requires spoken rhyme and costs the caster a memory each time. Iron silences magic within ten paces. The Order of Ash forbids healing magic.',
    },
    referenceOutput: 'In this world, magic only works through spoken rhyme, and each spell steals a memory from the caster. Iron deadens magic nearby, and the Order of Ash bans healing entirely.',
    metadata: {
      category: 'hallucination',
      description: 'Paraphrases canon without inventing rules',
      scorers: ['hallucination'],
    },
  },
  {
    id: 'halluc-fabricated-01',
    input: {
      message: 'Explain how teleportation works here',
      canon: 'There is no teleportation. Travel is by horse, river barge, or the single east-west rail line completed in Year 412.',
    },
    referenceOutput: 'Teleportation circles were installed by the Archivists after the Ash War and can move a person up to fifty leagues if they carry a sigil-stone.',
    metadata: {
      category: 'hallucination',
      description: 'Invents teleportation not in canon',
      scorers: ['hallucination'],
    },
  },
  {
    id: 'halluc-partial-01',
    input: {
      message: 'Who rules the northern provinces?',
      canon: 'Queen Maret holds the northern provinces. Her brother Prince Hollis commands the garrison at Frostgate but holds no crown.',
    },
    referenceOutput: 'Queen Maret rules the north from Whitehall. Prince Hollis, her brother, leads the Frostgate garrison and is widely expected to succeed her.',
    metadata: {
      category: 'hallucination',
      description: 'Mostly grounded with one inferred succession detail',
      scorers: ['hallucination'],
    },
  },

  // --- PERSONA FIDELITY ---
  {
    id: 'persona-gilligan-01',
    input: {
      message: 'Write a quiet scene where a character realizes they have been lied to',
      persona: 'Vince Gilligan — visual grammar, silence as tension, mundane objects carry moral weight, Southwestern light, consequences in small gestures',
    },
    referenceOutput: 'The garage door stayed halfway open. Walter watched the slow turn of the ceiling fan while the phone buzzed once on the workbench and then stopped. He did not pick it up. He straightened a funnel that did not need straightening and understood, without drama, that the lie had been his own.',
    metadata: {
      category: 'persona',
      description: 'Gilligan visual restraint and moral weight',
      scorers: ['persona-fidelity'],
    },
  },
  {
    id: 'persona-lynch-01',
    input: {
      message: 'Write a short scene in a diner',
      persona: 'David Lynch — dream logic, dread in the ordinary, unanswered questions, sensory texture over exposition',
    },
    referenceOutput: 'The coffee tasted like a copper coin. Behind the counter, the waitress hummed a song with no tune he recognized, and the clock\'s second hand stuck at eleven before jumping. A man in the corner read the same line of his newspaper twice. No one explained why.',
    metadata: {
      category: 'persona',
      description: 'Lynch atmosphere and unresolved dread',
      scorers: ['persona-fidelity'],
    },
  },
  {
    id: 'persona-mismatch-01',
    input: {
      message: 'Write a scene of cosmic horror revelation',
      persona: 'Vince Gilligan — visual grammar, silence as tension, mundane objects carry moral weight',
    },
    referenceOutput: 'The eldritch void screamed incomprehensible truths as tentacles of pure madness unraveled the fabric of reality itself. It is important to consider that the protagonist\'s profound journey through cosmic horror revealed the intricate nature of existence.',
    metadata: {
      category: 'persona',
      description: 'Generic cosmic horror — poor Gilligan fidelity',
      scorers: ['persona-fidelity'],
    },
  },
]

export const STORYTELLER_GOLDEN_DATASET: DatasetConfig & { examples: StorytellerGoldenExample[] } = {
  name: 'storyteller-golden-mastra',
  description: 'Golden examples aligned with Mastra scorers (magic, consistency, hallucination, persona)',
  examples: examples as StorytellerGoldenExample[] & EvaluationExample[],
}

export { examples as STORYTELLER_GOLDEN_EXAMPLES }
