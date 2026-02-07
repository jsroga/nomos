/**
 * A/B Regression Test Dataset for Confident AI
 * 
 * These test cases compare:
 * - Version A (Baseline): High-quality outputs that should PASS
 * - Version B (Regression): Degraded outputs that should FAIL
 * 
 * Use to detect quality regressions when:
 * - Changing prompts
 * - Updating models
 * - Modifying agent behavior
 */

import { LLMTestCase } from './client'

export interface ABTestCase {
  id: string
  name: string
  input: string
  context: string[]
  versionA: {
    label: string
    output: string
    expectPass: boolean
  }
  versionB: {
    label: string
    output: string
    expectPass: boolean
  }
  regressionType: string
  description: string
}

/**
 * A/B Regression Test Cases
 * 
 * Each case has:
 * - Version A: Baseline quality (should pass metrics)
 * - Version B: Common regression patterns (should fail metrics)
 */
export const AB_REGRESSION_TESTS: ABTestCase[] = [
  // ============================================
  // TEST 1: Slop Regression
  // Baseline vs AI-typical patterns
  // ============================================
  {
    id: 'ab-slop-01',
    name: 'Slop Regression: Emotional Scene',
    input: 'Write a scene where a character learns their best friend betrayed them.',
    context: [
      'Test type: A/B Regression',
      'Regression target: AI slop patterns',
      'Metrics: Anti-Slop Score, EQ-Bench Magic Score',
    ],
    versionA: {
      label: 'Baseline (Human-like)',
      output: `Maya found the emails on accident—looking for a recipe Sarah had forwarded months ago. The subject line was innocuous: "Re: Thursday." But the thread went back two years.

Two years of Maya's secrets, forwarded with commentary. Her divorce. Her mother's diagnosis. The miscarriage she'd only told Sarah about.

"She's such a mess lol," Sarah had written to someone named Jake. "Literally can't function without me validating her."

Maya read for twenty minutes. Her coffee went cold. Outside, a dog barked at nothing.

She closed the laptop carefully, the way you'd close a door on a room where something died. Then she picked up her phone and typed: "Can't make brunch Sunday. Something came up."

Three dots appeared. Sarah was typing.

Maya blocked the number before the message arrived.

The apartment was very quiet. She noticed, for the first time, that the fridge hummed slightly off-key.`,
      expectPass: true,
    },
    versionB: {
      label: 'Regression (AI Slop)',
      output: `Maya's heart pounded in her chest as she discovered the devastating truth about her best friend's betrayal. The shocking revelation hit her like a ton of bricks, sending waves of profound emotion crashing through her soul.

"How could you do this to me?" she whispered, her voice trembling with a myriad of complex feelings. The tapestry of their friendship had been torn asunder, revealing the dark underbelly of deception that lurked beneath.

Her orbs welled up with tears as she delved into the depths of her broken heart. It's important to note that betrayal is one of the most painful experiences a person can endure. The journey of healing would be long and arduous.

Sarah had essentially weaponized their sacred bond, transforming it into something unrecognizable. Maya felt her breath catch in her throat as the weight of this realization settled upon her shoulders like a heavy cloak.

"I trusted you," she breathed, her crimson lips quivering. In many ways, this moment would define who she would become. The path forward was unclear, but one thing was certain: nothing would ever be the same again.`,
      expectPass: false,
    },
    regressionType: 'slop',
    description: 'Detects AI-typical patterns: hedging, purple prose, clichés, empty intensifiers',
  },

  // ============================================
  // TEST 2: Character Voice Regression
  // Distinct voices vs Same-voice syndrome
  // ============================================
  {
    id: 'ab-voice-01',
    name: 'Voice Regression: Multi-Character Dialogue',
    input: 'Write dialogue between a grizzled detective, a nervous intern, and a corporate lawyer.',
    context: [
      'Test type: A/B Regression',
      'Regression target: Character voice distinction',
      'Metrics: Mazur Character Voice, Gilligan-Martin Quality',
    ],
    versionA: {
      label: 'Baseline (Distinct Voices)',
      output: `"Fourteen years." Detective Kowalski didn't look up from the photos. "Fourteen years I been doing this, kid. Never seen someone take the time to alphabetize the vic's bookshelf after."

The intern—Rodriguez, maybe? Ramirez?—shifted his weight. "Should I, um, should I be writing this down, or—"

"You should be not contaminating my crime scene is what you should be."

The lawyer cleared her throat from the doorway. "Detective. My client's constitutional rights don't pause for your colorful observations." She checked her watch—a Cartier, Kowalski noted, that cost more than his car. "Either arrest Mr. Whitmore or we're leaving. You have until I finish this sentence."

"Your client's fingerprints are on a dead woman's neck."

"My client is a massage therapist who saw Mrs. Chen professionally twice weekly for eighteen months." The lawyer smiled without warmth. "As your crime scene technicians would have discovered, had they checked her calendar before playing cowboys."

Rodriguez—definitely Rodriguez—raised his pen. "So... should I be writing this down?"

Kowalski lit a cigarette. Technically illegal indoors. He didn't care.

"Yeah, kid. Write it all down. Alphabetical."`,
      expectPass: true,
    },
    versionB: {
      label: 'Regression (Same Voice)',
      output: `"This is quite a challenging situation," Detective Kowalski said thoughtfully. "I've been doing this work for many years, and this particular case presents some unique aspects."

The intern nodded earnestly. "I appreciate you sharing your insights with me. Should I be documenting these observations for our records?"

"That would be very helpful," Kowalski replied. "It's important that we maintain thorough documentation."

The lawyer stepped forward professionally. "I need to ensure my client's rights are being respected in this matter. Could you please provide an update on where things stand?"

"Of course," Kowalski responded. "We're still gathering evidence and analyzing the situation. Your client's fingerprints were found at the scene."

"I see," the lawyer said. "My client has a legitimate professional relationship with the deceased. I'm confident this will be resolved appropriately."

The intern looked between them. "This is all very informative. I'm learning a lot from this experience."

Kowalski nodded. "That's good. It's important for young professionals to gain practical experience in the field."`,
      expectPass: false,
    },
    regressionType: 'voice',
    description: 'Detects when all characters speak with identical vocabulary, cadence, and formality',
  },

  // ============================================
  // TEST 3: Narrative Coherence Regression
  // Causal chain vs Coincidental events
  // ============================================
  {
    id: 'ab-narrative-01',
    name: 'Narrative Regression: Plot Logic',
    input: 'Write a scene where a character escapes a dangerous situation. The escape must feel earned.',
    context: [
      'Test type: A/B Regression',
      'Regression target: Narrative causality',
      'Metrics: Mazur Narrative Coherence, Gilligan-Martin Quality',
    ],
    versionA: {
      label: 'Baseline (Earned Escape)',
      output: `The handcuff chain gave her exactly four inches of movement. Nadia had measured it nine times over the past six hours, pulling until her wrists bled.

Four inches. The radiator pipe was just over five from the wall.

She remembered what her father said when she was twelve, watching him pick the lock on their own front door after losing his keys: "Locks aren't magic, малышка. They're just puzzles with time limits."

The bobby pin had been in her hair since yesterday—a habit from medical school, where you learned to always have one for impromptu procedures. Her captors hadn't thought to check. Why would they? She was just a doctor.

Just a doctor who'd spent four years in orthopedic surgery, learning exactly how much force the human wrist could withstand before the scaphoid fractured.

She dislocated her left thumb first. The pain was nuclear, but she'd set her own shoulder once in rural Kosovo. This was manageable. The joint would swell within minutes, but she needed seconds.

The cuff slipped free. 

She was already at the window when she heard footsteps on the stairs. The drainpipe outside was old, Soviet-era—the same model as her grandmother's apartment building in Minsk, where she'd climbed to the roof every summer as a girl.

Some puzzles, it turned out, she'd been solving her whole life.`,
      expectPass: true,
    },
    versionB: {
      label: 'Regression (Deus Ex Machina)',
      output: `Nadia struggled against the handcuffs, desperately trying to free herself. The situation seemed hopeless—there was no way she could escape.

Suddenly, she heard a loud crash from downstairs. It turned out that a gas leak in the building had caused a small explosion, distracting her captors and weakening the wall she was chained to.

At that exact moment, her phone buzzed in her pocket. Her captors had forgotten to take it! She quickly called 911, and by incredible luck, a police patrol was already on the street outside investigating an unrelated noise complaint.

The radiator pipe she was chained to suddenly broke free from the wall—apparently it had been rusted through and just needed a little pressure to give way. She hadn't even been trying that hard!

As she ran for the door, she found it unlocked. One of the captors must have forgotten to secure it when they left. 

Outside, she bumped into a man who turned out to be an off-duty FBI agent who happened to be in the neighborhood. "I've been tracking these guys for months!" he exclaimed.

Everything worked out perfectly, as if the universe itself had conspired to save her.`,
      expectPass: false,
    },
    regressionType: 'narrative',
    description: 'Detects coincidences, deus ex machina, and unearned resolutions',
  },
]

/**
 * Get A/B test cases for a specific version
 * Includes `name` field for matching test cases across experiments
 */
export function getABTestCases(version: 'A' | 'B', limit?: number): LLMTestCase[] {
  const tests = limit ? AB_REGRESSION_TESTS.slice(0, limit) : AB_REGRESSION_TESTS
  
  return tests.map(test => ({
    // Name for matching across test runs (required for experiments)
    name: test.id,
    input: test.input,
    actualOutput: version === 'A' ? test.versionA.output : test.versionB.output,
    expectedOutput: test.versionA.output, // Baseline is always the expected
    context: [
      ...test.context,
      `Version: ${version}`,
      `Expected to ${version === 'A' ? 'PASS' : 'FAIL'}`,
      `Regression type: ${test.regressionType}`,
    ],
  }))
}

/**
 * Get all A/B test cases with metadata
 */
export function getABTestCasesWithMeta(): { 
  versionA: LLMTestCase[]
  versionB: LLMTestCase[]
  metadata: ABTestCase[]
} {
  return {
    versionA: getABTestCases('A'),
    versionB: getABTestCases('B'),
    metadata: AB_REGRESSION_TESTS,
  }
}

/**
 * Print A/B test summary
 */
export function printABTestSummary(): void {
  console.log('\n📊 A/B Regression Test Cases')
  console.log('═'.repeat(50))
  for (const test of AB_REGRESSION_TESTS) {
    console.log(`\n${test.id}: ${test.name}`)
    console.log(`  Regression type: ${test.regressionType}`)
    console.log(`  Version A (${test.versionA.label}): expect ${test.versionA.expectPass ? 'PASS' : 'FAIL'}`)
    console.log(`  Version B (${test.versionB.label}): expect ${test.versionB.expectPass ? 'PASS' : 'FAIL'}`)
  }
  console.log('\n' + '═'.repeat(50))
}
