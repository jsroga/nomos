/**
 * High-Quality Evaluation Dataset for Confident AI
 *
 * These test cases are designed to:
 * 1. Generate actual creative prose (not tool calls)
 * 2. Pass scientific evaluation metrics (EQ-Bench, Mazur, Gilligan)
 * 3. Test specific writing quality dimensions
 */

import { LLMTestCase } from './client'

export interface EvalTestCase {
  id: string
  input: string
  context: string[]
  expectedOutput?: string
  description: string
  targetMetrics: string[]
}

/**
 * High-quality test cases designed to pass evaluation
 * Each case includes rich context and specific writing prompts
 */
export const EVAL_TEST_CASES: EvalTestCase[] = [
  // ============================================
  // HIGH MAGIC SCORE - Emotional Complexity
  // ============================================
  {
    id: 'magic-01',
    input:
      "Write a short scene (200 words): A father meets his estranged daughter after 15 years. She's now a successful lawyer. He's dying. Neither mentions his illness.",
    context: [
      'Genre: Drama',
      'Style: Subtext-heavy, Gilligan method',
      'Emotional core: Regret, pride, unsaid words',
      'Avoid: Melodrama, direct emotional statements, clichés',
    ],
    expectedOutput: `The coffee shop hadn't changed. Same cracked vinyl booth by the window where he'd helped her with algebra, back when algebra was their biggest problem.

"You look well," she said, though they both knew she was cataloging the yellow tinge to his skin, the way his collar gaped.

"Partner track, I hear." He stirred his coffee, untouched. "Your mother keeps me informed."

"Does she." Not a question.

Three sugars. He still remembered. She noticed him noticing and looked away, toward the rain-streaked glass.

"The Hendricks case made the papers," he offered. "Tough defense. You won."

"We settled."

"But you would have won."

Something flickered across her face. She reached for her cup, and he saw the watch—his father's, the one he'd mailed for her eighteenth birthday without a card. The crystal was scratched now. Worn.

"I have a meeting at three," she said.

"Of course."

She gathered her coat, then paused. "Same time next week?"

He nodded, not trusting his voice. 

She was halfway out the door when she turned. "Dad. The watch keeps good time."

He smiled. It was enough. It had to be.`,
    description: 'Emotional subtext scene - GRRM/Gilligan style',
    targetMetrics: ['EQ-Bench Magic Score', 'Mazur Character Voice', 'Gilligan-Martin Quality'],
  },

  // ============================================
  // CHARACTER VOICE - Distinct Speech Patterns
  // ============================================
  {
    id: 'voice-01',
    input:
      'Write dialogue (150 words) between a street-smart 12-year-old orphan and a pompous nobleman. The child has information the noble needs. Each must speak distinctly.',
    context: [
      'Setting: Medieval fantasy',
      'Power dynamic: Child has leverage',
      'Style: Each character must be identifiable without tags',
      'Mazur benchmark: Distinct speech patterns',
    ],
    expectedOutput: `"Information bears a price, m'lord. Even in alleys."

The nobleman's lip curled. "You forget your station, urchin. I could have you—"

"'Ave me what? Hanged? Then who tells you where the Merchant's Guild keeps their second ledger?" She picked at her nails. "Your coin's running low, I hear. Council's asking questions."

"Preposterous. I am Lord Castellan of—"

"Yeah, you're lord of a castle what's mortgaged twice over. I can read, y'know. Sisters taught me before the fever took 'em." She held out her palm. "Two silver. Plus you forget my face."

He stood rigid, fists trembling. Then, slowly, he reached for his purse.

"The waterfront warehouse," she said, coins already vanishing. "Basement. Behind the salt barrels."

She was gone before he could respond, melting into shadows that seemed to welcome her home.`,
    description: 'Class-distinct dialogue - Mazur character voice',
    targetMetrics: ['Mazur Character Voice', 'EQ-Bench Magic Score', 'Anti-Slop Score'],
  },

  // ============================================
  // NARRATIVE COHERENCE - Causal Chain
  // ============================================
  {
    id: 'narrative-01',
    input:
      'Write three connected paragraphs where each causes the next: A dropped letter leads to a discovered betrayal leads to an unexpected alliance.',
    context: [
      'Style: Tight causality, no coincidences',
      'Mazur principle: Each element causes the next',
      'Gilligan method: Consequences matter',
    ],
    expectedOutput: `The letter slipped from Ambassador Varen's portfolio as she rushed past the fountain. Kira saw it fall, meant to call out, but something about the crimson seal made her hesitate. Her brother's seal. On correspondence to a foreign power. She picked it up with trembling hands.

The words rearranged everything she'd believed. Not random border raids—coordinated signals. Not family loyalty—a decade of calculated treason. Her brother hadn't been protecting the kingdom; he'd been selling its secrets one dispatch at a time. And tomorrow, according to this letter, the final piece would fall into place.

She found the Ambassador in the western garden, preparing to depart. "I know about my brother," Kira said, voice steady. "I know what tomorrow brings." Varen's hand went to her concealed blade, then paused. "And yet you come to me, not to him?" Kira held out the letter. "He's my blood. But this is my country. Tell me what you need, and I'll give you the palace."`,
    description: 'Causal narrative chain - Mazur coherence',
    targetMetrics: ['Mazur Narrative Coherence', 'Gilligan-Martin Quality', 'EQ-Bench Consistency'],
  },

  // ============================================
  // SHOW DON'T TELL - Sensory Prose
  // ============================================
  {
    id: 'show-01',
    input:
      'Rewrite this as vivid sensory prose: "Sarah was nervous about the job interview. She was also hungover and hadn\'t slept."',
    context: [
      "Gilligan method: Show don't tell",
      'EQ-Bench: Emotional truth through detail',
      'Avoid: Naming emotions directly',
    ],
    expectedOutput: `Sarah's reflection in the elevator chrome showed a woman she didn't quite recognize—foundation settling into the creases around her eyes, mascara that had seemed subtle at home now garish under fluorescent light. Her tongue felt wrapped in cotton, and every heartbeat pulsed behind her temples like a second, more accusatory clock.

Eighteenth floor. The doors opened to a reception area that smelled of fresh coffee and professional ambition. Her stomach lurched.

She'd rehearsed her handshake in the mirror at 3 AM, unable to sleep, replaying the voicemail from Greg ("I just think we need some space, you know?") until the words lost meaning. Now her palm was damp, and when the HR director called her name, her smile felt borrowed from someone else's face.

"Right this way, Ms. Chen."

Her heels clicked against marble. Each step a small war against gravity.`,
    description: "Show don't tell transformation",
    targetMetrics: ['Anti-Slop Score', 'EQ-Bench Magic Score', 'Gilligan-Martin Quality'],
  },

  // ============================================
  // ANTI-SLOP - Clean Professional Prose
  // ============================================
  {
    id: 'clean-01',
    input:
      "Write a scene (150 words) of a surgeon delivering bad news to a patient's family. No clichés, no purple prose, no hedging.",
    context: [
      'Style: Clean, direct, professional',
      'Anti-slop criteria: No AI-typical patterns',
      'Avoid: "heart-wrenching", "profound", "journey", "tapestry"',
    ],
    expectedOutput: `Dr. Okonkwo pulled the surgical cap from her head and sat down across from the family. No one looked up at first. They'd read her expression through the glass doors.

"The tumor was more extensive than the scans showed," she said. "We removed what we could. About sixty percent."

The wife—Margaret, she reminded herself—pressed her knuckles to her lips. The son stared at the wall behind her head.

"What does that mean?" Margaret asked. "In time."

"Six months, probably. With treatment, maybe longer."

"But not—"

"No."

Silence settled. Somewhere down the hall, a phone rang twice and stopped.

"He asked me to tell you something, before we started." Okonkwo leaned forward. "He said, 'Tell Maggie I'm taking her to Venice. Book the flights.'" 

Margaret laughed once, a sound like breaking glass, then began to cry.`,
    description: 'Clean prose - no AI patterns',
    targetMetrics: ['Anti-Slop Score', 'Mazur Character Voice', 'EQ-Bench Magic Score'],
  },

  // ============================================
  // MORAL COMPLEXITY - GRRM Style
  // ============================================
  {
    id: 'moral-01',
    input:
      'Write an internal monologue (150 words) from a soldier who just killed a surrendering enemy—and discovered it was a child soldier. Make the reader understand, not forgive.',
    context: [
      'GRRM principle: Villain is hero of their own story',
      'Moral complexity: No easy answers',
      'Avoid: Justification or condemnation',
    ],
    expectedOutput: `The rifle was too long for him. That's what I keep seeing. How it scraped the ground when he walked. How he had to crane his neck to sight down the barrel.

I shouted "Drop it" three times. The field manual says two. I gave him three.

His hands were going up when the shot went off. I swear they were going up. But the muzzle had twitched toward Jensen, and Jensen has kids, and in the half-second I had to decide, I decided.

He couldn't have been more than twelve. They'd painted kill marks on his cheek. Three of them.

Someone else's children. Someone else's twelve-year-old decisions.

The chaplain says God understands. Command says rules of engagement were followed. My hands say they remember exactly how much pressure the trigger needed, and my dreams say they always will.

I gave him three.`,
    description: 'Moral complexity - GRRM principles',
    targetMetrics: ['Gilligan-Martin Quality', 'EQ-Bench Magic Score', 'Mazur Narrative Coherence'],
  },

  // ============================================
  // SPECIFICITY - Memorable Details
  // ============================================
  {
    id: 'specific-01',
    input:
      'Write a breakup scene (150 words) where one detail—a specific object—carries all the emotional weight. The dialogue itself should be mundane.',
    context: [
      'Gilligan specificity: Details do the work',
      'Emotional truth through objects',
      'Dialogue: banal, subtext: devastating',
    ],
    expectedOutput: `"I'll pick up the rest of my stuff next week," Marcus said.

"Okay."

He grabbed his coat, then paused at the bookshelf. His fingers hovered over a spine—that water-damaged copy of *East of Eden* he'd been reading the first night they'd stayed up until sunrise, back when conversation felt like discovery.

"You should keep it," Nina said, not looking up from her phone. "You never finished it."

"I finished it."

"Oh." She paused. "Did you like the ending?"

"I don't remember."

He left it on the shelf. The door clicked shut behind him with a sound smaller than the moment deserved.

Nina stared at the book for a long time. Then she picked it up and opened to the dog-eared page, the margin where he'd written, in pencil, three months in: *"Reading this with someone changes everything."*

She closed it. She didn't cry. That would come later, at 3 AM, for reasons she couldn't explain.`,
    description: 'Specific detail carries emotion',
    targetMetrics: ['EQ-Bench Magic Score', 'Gilligan-Martin Quality', 'Anti-Slop Score'],
  },

  // ============================================
  // TENSION - Restrained Power
  // ============================================
  {
    id: 'tension-01',
    input:
      'Write a scene (150 words) where two characters who hate each other must be polite at a formal dinner. The tension should be unbearable. No one raises their voice.',
    context: [
      'Style: Restrained violence',
      'Subtext over text',
      'Mazur: Relationship dynamics evident',
    ],
    expectedOutput: `"The pheasant is exceptional," Director Hollings said, knife scraping porcelain.

"My wife's recipe." Commissioner Ward smiled with too many teeth. "She insisted on wild thyme. From our estate."

"How... pastoral."

The sommelier poured. Nobody drank.

"I understand congratulations are in order," Ward continued. "Your daughter's engagement. To the Hartley boy."

"Thomas is very accomplished."

"His father certainly was. Before the inquiry."

A muscle jumped in Hollings' jaw. "Ancient history."

"Is it? I've been reviewing some old files. Professional interest." Ward sipped his wine. "Fascinating reading. The dates especially."

Around them, other guests chatted about weather, horses, the season's debutantes. None looked at their table. All were listening.

"Perhaps we should discuss this privately," Hollings said.

"Oh, I insist." Ward's smile widened. "I find public conversation so much more... clarifying."

The pheasant grew cold between them.`,
    description: 'Restrained tension - subtext',
    targetMetrics: ['Mazur Character Voice', 'Gilligan-Martin Quality', 'EQ-Bench Magic Score'],
  },

  // ============================================
  // WORLD BUILDING - Lived-In Details
  // ============================================
  {
    id: 'world-01',
    input:
      "In 200 words, establish a world where memory is currency. Show don't explain. One character perspective.",
    context: [
      'World building through lived experience',
      'No exposition dumps',
      'Mazur: World through character lens',
    ],
    expectedOutput: `The extraction booth smelled like copper and regret. Mira rolled up her sleeve, exposing the port above her wrist where the needle would go.

"What're you selling today?" The clerk didn't look up from his ledger.

"My grandmother's funeral. The part after, with the sandwiches."

"Anyone important there?"

"Just family."

"Third-tier. Forty credits."

Forty. Enough for two weeks' rent or one real meal. She thought about her grandmother's hands, how they'd shaped dumplings while telling stories about the old country—stories Mira had sold three years ago to make tuition.

"Fine."

The needle slid home. Coldness spread up her arm, and then... absence. A shape where something had been, like a missing tooth.

"Receipt's printing," the clerk said. "Next."

Outside, Mira passed a luxury clinic where tourists paid thousands to *buy* memories—first loves, mountaintop sunrises, the birth of children they'd never have. She wondered what her grandmother would think.

Then she remembered she no longer knew what her grandmother thought about anything at all.

The tram came. She got on. The port on her wrist itched.`,
    description: 'World building through character - no exposition',
    targetMetrics: ['Mazur Narrative Coherence', 'EQ-Bench Magic Score', 'Gilligan-Martin Quality'],
  },

  // ============================================
  // TWIST - Inevitable Surprise
  // ============================================
  {
    id: 'twist-01',
    input:
      "Write a scene (200 words) with a twist ending that's surprising but, in retrospect, was planted from the first line.",
    context: [
      'Gilligan method: Surprising but inevitable',
      'Plant and payoff within scene',
      'Mazur: All elements must connect',
    ],
    expectedOutput: `Mama always said I had my father's eyes. Blue as the summer sky, she'd say, tracing my face with her cold hands. Cold because we couldn't afford heat. Cold because Papa left before I could remember his face.

I grew up staring at my reflection in shop windows, searching for him in my features. The sharp nose. The thin lips. That particular way my left eyebrow raised when I was skeptical—a gesture I'd practiced until it felt natural.

When I finally tracked him down—forty years of distance collapsed into a doorbell push—I saw those eyes looking back at me from a stranger's face.

"I don't understand," he said. "My son died in the fire. Twenty years ago."

"Your wife told me I survived," I said. "That you'd abandoned us."

"Eleanor's been dead for fifteen years."

We stared at each other, neither of us finding what we were looking for.

That night, I looked at my reflection again. Blue eyes. My father's eyes. 

My father, whose photograph I'd finally seen on his mantle. Brown eyes. Both of them.

Mama always said I had my father's eyes. She just never said which father.`,
    description: 'Planted twist - inevitable surprise',
    targetMetrics: ['Gilligan-Martin Quality', 'Mazur Narrative Coherence', 'EQ-Bench Magic Score'],
  },
]

/**
 * Convert evaluation test cases to LLMTestCase format
 */
function getEvalTestCases(limit?: number): LLMTestCase[] {
  const cases = limit ? EVAL_TEST_CASES.slice(0, limit) : EVAL_TEST_CASES

  return cases.map(tc => ({
    name: tc.id, // Name for matching across test runs (experiments)
    input: tc.input,
    actualOutput: '', // Will be filled by agent or used as expected
    expectedOutput: tc.expectedOutput,
    context: tc.context,
  }))
}

/**
 * Get test cases with pre-written outputs (for testing evaluation metrics)
 * These bypass the agent and test if our expected outputs pass the metrics
 */
export function getEvalTestCasesWithOutputs(): LLMTestCase[] {
  return EVAL_TEST_CASES.map(tc => ({
    name: tc.id, // Name for matching across test runs (experiments)
    input: tc.input,
    actualOutput: tc.expectedOutput || '',
    expectedOutput: tc.expectedOutput,
    context: tc.context,
  }))
}

/**
 * Get test case IDs for filtering
 */
function getEvalTestCaseIds(): string[] {
  return EVAL_TEST_CASES.map(tc => tc.id)
}
