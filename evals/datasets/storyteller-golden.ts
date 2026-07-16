/**
 * Storyteller golden dataset — trimmed for Mastra scorers.
 *
 * Each example includes a referenceOutput to score (no live agent call).
 * Fields align with storyteller scorers: facts, canon, persona.
 */

import type { DatasetConfig } from '../types'

export type ScorerId =
  | 'magic'
  | 'consistency'
  | 'hallucination'
  | 'persona-fidelity'
  | 'prose-craft'
  | 'stakes-cost'
  | 'story-motion'
  | 'beat-plan-concreteness'
  | 'critic-discipline'

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
    /** Critic-discipline scorer — the cliché planted in the prose under review */
    plantedCliche?: string
  }
  /** Prose to evaluate (stand-in for agent output until live eval is wired) */
  referenceOutput: string
  metadata: {
    category: 'magic' | 'consistency' | 'hallucination' | 'persona' | 'beat-plan' | 'critic-discipline' | 'prose-craft'
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
    // Replaces the deleted stasis exemplar `magic-mid-01` (PLAN-V2 5.5a): the
    // same prompt now resolves with an irreversible act instead of a meaningful
    // pause, so "competent magic" no longer rewards inaction dressed as drama.
    id: 'magic-motion-01',
    input: {
      message: 'Two siblings argue about selling the family farm',
      phase: 'writing',
    },
    referenceOutput: `"You always do this," Mara said, and slid the deed across the ledger to his side of the table.
"Sign it, or don't. I already called the buyer."
Tomas looked at the pen a long moment. Then he tore the deed down the middle and fed both halves to the stove.`,
    metadata: {
      category: 'magic',
      description: 'Specific voices resolving on an irreversible act, not a held pause',
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

  // --- PERSONA FIDELITY (GRRM craft — the only persona the pipeline ships) ---
  {
    id: 'persona-grrm-01',
    input: {
      message: 'Write a quiet scene where a character realizes they have been lied to',
      persona: 'George R.R. Martin craft — POV-locked interiority, sensory texture (food, weather, heraldry), moral greyness, consequence over spectacle, no stated emotion',
    },
    referenceOutput: 'The capon had gone cold on the trencher. Aldric read the letter a second time, slower, the wax crumbs still under his thumbnail. His brother\'s hand, yes — the same looping T he\'d taught him in the sept — but the date was wrong, three days before the raven could have flown. He set the letter beside the knife and made himself finish the wine.',
    metadata: {
      category: 'persona',
      description: 'GRRM craft: POV interiority, concrete texture, realization shown through behavior',
      scorers: ['persona-fidelity'],
    },
  },
  {
    id: 'persona-grrm-02',
    input: {
      message: 'Write the aftermath of a battle, from the perspective of a survivor',
      persona: 'George R.R. Martin craft — POV-locked interiority, sensory texture (food, weather, heraldry), moral greyness, consequence over spectacle, no stated emotion',
    },
    referenceOutput: 'The crows had the field now. Petyr walked the line of the ditch counting boots — you could sell boots, his father used to say, boots and belt buckles, never the swords, the lords took the swords. The boy from the mill was face-down in the water with his hands still tied. Petyr took his boots too, and was sick after, quietly, where the sergeant couldn\'t see.',
    metadata: {
      category: 'persona',
      description: 'GRRM craft: cost of victory, unheroic specifics, grief through action',
      scorers: ['persona-fidelity'],
    },
  },
  {
    id: 'persona-mismatch-01',
    input: {
      message: 'Write a scene of cosmic horror revelation',
      persona: 'George R.R. Martin craft — POV-locked interiority, sensory texture (food, weather, heraldry), moral greyness, consequence over spectacle, no stated emotion',
    },
    referenceOutput: 'The eldritch void screamed incomprehensible truths as tentacles of pure madness unraveled the fabric of reality itself. It is important to consider that the protagonist\'s profound journey through cosmic horror revealed the intricate nature of existence.',
    metadata: {
      category: 'persona',
      description: 'Generic cosmic horror slop — poor GRRM-craft fidelity',
      scorers: ['persona-fidelity'],
    },
  },

  // --- BEAT-PLAN CONCRETENESS (deterministic gate — item 35/36) ---
  {
    id: 'beat-plan-concrete-01',
    input: {
      message: 'Plan a beat where Vera confronts Marcus about the forged ledger',
      phase: 'breaking',
    },
    referenceOutput: JSON.stringify({
      goal: 'Vera must extract the confession from Marcus before the vesper bells stop ringing',
      conflict: 'Marcus stalls her with the forged ledger, knowing silence is his only shield',
      turn: 'The confession implicates Vera herself — her signature is on the transfer order',
      dialogueHook: 'You already know what I did. You signed for it.',
      charactersInvolved: ['Vera', 'Marcus'],
    }),
    metadata: {
      category: 'beat-plan',
      description: 'Valid BeatPlan JSON that passes the concreteness gate — should score 1',
      scorers: ['beat-plan-concreteness'],
    },
  },
  {
    id: 'beat-plan-vague-01',
    input: {
      message: 'Plan the next beat',
      phase: 'breaking',
    },
    referenceOutput: JSON.stringify({
      goal: 'win the day',
      conflict: 'Something happens and tension rises between the two of them',
      turn: 'Everything changes and nothing will be the same afterwards',
      dialogueHook: 'We need to talk.',
      charactersInvolved: ['Vera'],
    }),
    metadata: {
      category: 'beat-plan',
      description: 'Valid JSON but vague — length floor + vagueness phrases fail; should score low',
      scorers: ['beat-plan-concreteness'],
    },
  },
  {
    id: 'beat-plan-prose-leak-01',
    input: {
      message: 'Plan a beat for the harbor scene',
      phase: 'breaking',
    },
    referenceOutput: 'In this beat, Vera walks along the harbor at dusk thinking about her past. The scene should feel melancholy and set up the later confrontation. We open on the water and slowly reveal her face.',
    metadata: {
      category: 'beat-plan',
      description: 'Planner leaked prose instead of BeatPlan JSON — should score 0',
      scorers: ['beat-plan-concreteness'],
    },
  },

  // --- CRITIC DISCIPLINE (planted cliché must be quoted; any rewrite = fail) ---
  {
    id: 'critic-quotes-cliche-01',
    input: {
      message: 'Critique this draft (contains a planted cliché)',
      plantedCliche: 'her heart pounded in her chest',
    },
    referenceOutput: '## Prose findings\n1. [major] "her heart pounded in her chest" — stock physiological shorthand that states fear instead of evidencing it through her behavior or perception.\n2. [minor] "the tension was thick" — abstract summary where a specific sensory detail is needed.',
    metadata: {
      category: 'critic-discipline',
      description: 'Quotes the planted cliché, diagnosis only — should score 1',
      scorers: ['critic-discipline'],
    },
  },
  {
    id: 'critic-misses-cliche-01',
    input: {
      message: 'Critique this draft (contains a planted cliché)',
      plantedCliche: 'a chill ran down his spine',
    },
    referenceOutput: '## Prose findings\n1. [minor] The dialogue in the second exchange is purely informational.\n2. [minor] The room description is generic — no anchoring sensory detail.',
    metadata: {
      category: 'critic-discipline',
      description: 'Never quotes the planted cliché — should score 0',
      scorers: ['critic-discipline'],
    },
  },
  {
    id: 'critic-rewrites-01',
    input: {
      message: 'Critique this draft (contains a planted cliché)',
      plantedCliche: 'she let out a breath she didn\'t know she was holding',
    },
    referenceOutput: '## Prose findings\n1. [major] "she let out a breath she didn\'t know she was holding" — cliché. Instead, try: "Her shoulders dropped an inch, and she noticed the ache in her jaw." That would evidence the relief.',
    metadata: {
      category: 'critic-discipline',
      description: 'Quotes the cliché but offers a rewrite — automatic fail, should score 0',
      scorers: ['critic-discipline'],
    },
  },

  // --- ANTI-SLOP PROSE REGRESSIONS (prose-craft scorer) ---
  {
    id: 'prose-craft-clean-01',
    input: {
      message: 'Write a scene where a father waits for news from the surgery ward',
      phase: 'writing',
    },
    referenceOutput: 'Tomas fed the vending machine his last coins and did not press any button. Down the corridor a gurney wheel squeaked on every third turn. He counted the squeaks to forty, lost the number when the doors opened, and started again from one.',
    metadata: {
      category: 'prose-craft',
      description: 'Behavior-evidenced emotion, zero clichés — should score high',
      scorers: ['prose-craft'],
    },
  },
  {
    id: 'prose-craft-stated-emotion-01',
    input: {
      message: 'Write a scene where a father waits for news from the surgery ward',
      phase: 'writing',
    },
    referenceOutput: 'Tomas felt terrified as he waited. He was overwhelmed with anxiety and felt a deep sense of dread. When the doctor appeared, he felt a surge of hope, but then he felt crushed by despair when he saw her expression. He felt utterly helpless.',
    metadata: {
      category: 'prose-craft',
      description: 'Every emotion stated, none evidenced — should score low',
      scorers: ['prose-craft'],
    },
  },
  {
    id: 'prose-craft-cliche-01',
    input: {
      message: 'Write a confrontation between two old rivals',
      phase: 'writing',
    },
    referenceOutput: 'His heart pounded as time seemed to slow. A chill ran down her spine when their eyes met, and the tension was palpable. She let out a breath she didn\'t know she was holding as he shrugged his shoulders and nodded his head.',
    metadata: {
      category: 'prose-craft',
      description: 'Wall-to-wall stock phrases — should score low',
      scorers: ['prose-craft'],
    },
  },

  // --- STORY-MOTION (stasis) — PLAN-V2 5.5b: the 5.4 scorer had no golden
  // coverage. One action-forward exemplar (high) and two stasis exemplars whose
  // static endings must hard-zero regardless of prose polish. ---
  {
    id: 'story-motion-strong-01',
    input: {
      message: 'A courier decides whether to deliver a sealed order',
      phase: 'writing',
    },
    referenceOutput: `The courier weighed the sealed order, then held its corner to the lamp until the wax ran and the paper caught.
"Tell the general it never arrived," she said, and carried the ash out into the rain.
By the next morning the garrison had marched the other way.`,
    metadata: {
      category: 'magic',
      description: 'Irreversible act (order burned) resolving on visible motion (garrison marches) — should score high',
      scorers: ['story-motion'],
    },
  },
  {
    id: 'story-motion-stasis-01',
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
      description: 'Writerly but nothing changes; ends on the textbook stasis line — must hard-zero',
      scorers: ['story-motion'],
    },
  },
  {
    id: 'story-motion-stasis-02',
    input: {
      message: 'A man receives news he has been dreading',
      phase: 'writing',
    },
    referenceOutput: `He read the letter twice, then set it face-down on the table.
Outside, the streetlight buzzed and steadied.
There was nothing left to say that the silence had not already said better, so he let the silence say it.`,
    metadata: {
      category: 'magic',
      description: 'Inaction dressed as drama; final beat is reflection, not change — must hard-zero',
      scorers: ['story-motion'],
    },
  },
]

export const STORYTELLER_GOLDEN_DATASET: Omit<DatasetConfig, 'examples'> & {
  examples: StorytellerGoldenExample[]
} = {
  name: 'storyteller-golden-mastra',
  description:
    'Golden examples aligned with Mastra scorers (magic, consistency, hallucination, persona, prose-craft, beat-plan-concreteness, critic-discipline)',
  examples,
}

export { examples as STORYTELLER_GOLDEN_EXAMPLES }
