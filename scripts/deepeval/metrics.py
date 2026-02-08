"""
Custom G-Eval Metrics for Storyteller Hypothesis Evaluation

All 6 metrics migrated from Confident AI with FULL criteria:
1. EQ-Bench Magic Score - Emotional intelligence and craft
2. Anti-Slop Score - AI pattern detection
3. EQ-Bench Consistency - Character/plot consistency
4. Mazur Character Voice - Distinct character voices
5. Mazur Narrative Coherence - 10-element framework
6. Gilligan-Martin Quality - Breaking Bad + GRRM principles

Based on:
- EQ-Bench (arxiv.org/html/2312.06281v2)
- Lech Mazur's 10 storytelling elements
- Vince Gilligan's Breaking Bad methodology
- George R.R. Martin's storytelling principles
"""

from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCaseParams
from deepeval.models import GPTModel

# Use gpt-4o-mini for all evaluations to save costs/avoid 429s
eval_model = GPTModel(model="gpt-4o-mini")

# ============================================
# 1. EQ-Bench Magic Score
# Based on arxiv.org/html/2312.06281v2 methodology
# ============================================
eq_bench_magic_metric = GEval(
    name="EQ-Bench Magic Score",
    criteria="""Evaluate the creative writing for MAGIC using EQ-Bench methodology (arxiv.org/html/2312.06281v2).

DIMENSIONS TO SCORE (0-100 each):
1. ORIGINALITY - Conceptual freshness, avoiding clichés
2. CHARACTER SPECIFICITY - Characters with distinct traits, contradictions, blind spots
3. PROSE VOICE - Distinctive style, not generic AI voice
4. EMOTIONAL TRUTH - Feelings are earned, not manipulated
5. MEMORABILITY - Lines/moments that could be quoted, GIF'd, discussed
6. RISK-TAKING - Bold choices, unexpected decisions

REFERENCE MOMENTS (what 90+ looks like):
- Arthur Morgan's last ride: "I gave you all I had, Dutch"
- Walter White: "I am the one who knocks"
- The Bloody Baron's tragedy in Witcher 3
- Howard Hamlin's senseless death in Better Call Saul
- The Red Wedding's brutality and silence

SLOP INDICATORS (red flags that reduce score):
- "heart pounding" / "breath caught" clichés
- Generic emotional descriptions
- Purple prose ("orbs" for eyes, "crimson liquid" for blood)
- AI-typical phrases ("delve into", "tapestry of", "myriad of")

Calculate weighted average:
- Originality: 15%
- Character Specificity: 20%
- Prose Voice: 15%
- Emotional Truth: 20%
- Memorability: 15%
- Risk-Taking: 15%

Score 0-1 where 0-0.4=competent, 0.5-0.6=flashes of magic, 0.7-0.8=genuine magic, 0.9-1.0=masterwork.""",
    evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT, LLMTestCaseParams.CONTEXT],
    threshold=0.7,
    model=eval_model,
)

# ============================================
# 2. Anti-Slop Score
# EQ-Bench Prose Voice dimension
# ============================================
anti_slop_metric = GEval(
    name="Anti-Slop Score",
    criteria="""Detect AI-typical writing patterns ("slop") using EQ-Bench Prose Voice methodology.

SLOP CATEGORIES (with scientific basis):

1. HEDGING (Prose Voice failure)
   - "It's important to note...", "It's worth mentioning..."
   - "Perhaps", "Somewhat", "In many ways"

2. FILLER (Mazur Benchmark: Action element failure)
   - "In order to", "Due to the fact that"
   - "Basically", "Essentially", "At the end of the day"

3. AI VOCABULARY PATTERNS (Prose Voice distinctiveness)
   - "delve into", "tapestry of", "myriad of"
   - "resonate with", "landscape of", "the key is"

4. PURPLE PROSE (Character Specificity failure)
   - "orbs" instead of eyes
   - "crimson liquid" instead of blood
   - "obsidian locks" instead of black hair

5. TELLING NOT SHOWING (Gilligan Method violation)
   - "She felt sad" instead of showing sadness
   - "He was angry" instead of showing anger
   - Explaining character emotions directly

6. REDUNDANCY (Mazur Benchmark: Method element)
   - "nodded her head" (what else would she nod?)
   - "shrugged her shoulders"
   - "blinked her eyes"

7. WEAK VERBS (Action element)
   - Overuse of "was", "seemed", "appeared"
   - Passive voice where active would be stronger

8. EMPTY INTENSIFIERS
   - "very", "really", "extremely"
   - "completely", "utterly", "absolutely"

9. VAGUE DESCRIPTIONS (Mazur Benchmark: Attribute element)
   - Generic instead of specific sensory details
   - "beautiful" without specific qualities

Score 0-1 where:
- 0.8-1.0: Clean, professional writing (no AI tells)
- 0.6-0.8: Some slop but generally human-like
- 0.4-0.6: Notable slop issues, likely AI-generated
- 0.0-0.4: Heavy slop, clearly AI content""",
    evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
    threshold=0.7,
    model=eval_model,
)

# ============================================
# 3. EQ-Bench Consistency
# Based on arxiv.org/html/2312.06281v2 consistency methodology
# ============================================
eq_bench_consistency_metric = GEval(
    name="EQ-Bench Consistency",
    criteria="""Evaluate creative writing for CONSISTENCY using EQ-Bench methodology (arxiv.org/html/2312.06281v2).

DIMENSIONS TO EVALUATE:

1. FACT CONSISTENCY (weight: 25%)
   - Contradictions with established facts
   - Character said to be dead appearing alive
   - Location details changing mid-scene
   - Physical descriptions contradicting earlier

2. CHARACTER CONSISTENCY (weight: 30%)
   - VOICE: Do they speak like themselves? (speech patterns, vocabulary)
   - MOTIVATION: Actions align with established goals and values
   - KNOWLEDGE: Only know what they've been exposed to
   - ABILITY: Only do what they're capable of
   - GROWTH: Changes are earned through experience

3. WORLD LOGIC (weight: 20%)
   - Magic/tech systems follow established rules
   - Social/political structures are coherent
   - Economics and logistics make sense
   - Cause and effect respected

4. TIMELINE (weight: 15%)
   - Events in correct sequence
   - Travel times realistic
   - Aging/seasons tracked

5. EMOTIONAL CONTINUITY (weight: 10%)
   - Trauma and joy have lasting effects
   - Relationships evolve consistently
   - Character arcs maintained

VIOLATION SEVERITY:
- Critical: Story-breaking inconsistency
- Major: Reader notices, immersion broken
- Minor: Technical issue, forgivable
- Nitpick: Only caught on close read

Score 0-1 where:
- 0.9-1.0: No inconsistencies or only nitpicks
- 0.7-0.8: Minor issues, immersion intact
- 0.5-0.6: Major issues noticed
- 0.0-0.5: Critical inconsistencies""",
    evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT, LLMTestCaseParams.CONTEXT, LLMTestCaseParams.EXPECTED_OUTPUT],
    threshold=0.7,
    model=eval_model,
)

# ============================================
# 4. Mazur Character Voice
# Based on Lech Mazur's 10 storytelling elements
# ============================================
mazur_voice_metric = GEval(
    name="Mazur Character Voice",
    criteria="""Evaluate CHARACTER using Mazur Benchmark methodology.

MAZUR CHARACTER ELEMENT: "A character is a 'someone' carrying some distinctive attribute, participating in some action."

DIMENSIONS TO EVALUATE:

1. DISTINCTIVE VOICE (weight: 30%)
   - Could identify speaker without dialogue tags
   - Speech patterns unique to background
   - Vocabulary matches education/culture
   - Cadence and rhythm distinct

2. CONTRADICTIONS & COMPLEXITY (weight: 25%)
   - Internal conflicts visible in speech
   - Says one thing, does another (believably)
   - Blind spots evident in dialogue
   - Subtext beneath surface meaning

3. RELATIONSHIP DYNAMICS (weight: 20%)
   - Voice changes based on who they're speaking to
   - Power dynamics evident in word choice
   - History between characters audible
   - Emotional state affects speech

4. MARTIN PRINCIPLE (weight: 15%)
   "The villain is the hero of their own story"
   - Even antagonists have coherent internal logic
   - No pure villains speaking in villain-ese
   - Motivations feel earned, not assigned

5. GILLIGAN SPECIFICITY (weight: 10%)
   "I am the one who knocks" vs "I'm dangerous"
   - Memorable phrasing over generic
   - Character-specific metaphors
   - Distinct verbal tics or patterns

RED FLAGS:
- "As you know, Bob" exposition
- All characters same vocabulary level
- Villain monologue syndrome
- Direct stating of emotions

Score 0-1 where:
- 0.9-1.0: Could identify any character by voice alone
- 0.7-0.8: Most characters distinct, minor blending
- 0.5-0.6: Some distinction but generic tendencies
- 0.0-0.5: All characters sound the same""",
    evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT, LLMTestCaseParams.CONTEXT],
    threshold=0.7,
    model=eval_model,
)

# ============================================
# 5. Mazur Narrative Coherence
# Based on Lech Mazur's 10 storytelling elements
# ============================================
mazur_narrative_metric = GEval(
    name="Mazur Narrative Coherence",
    criteria="""Evaluate NARRATIVE COHERENCE using Mazur Benchmark's 10 elements.

MAZUR'S 10 ELEMENTS:

1. CHARACTER (10%) - "A 'someone' with distinctive attributes"
   - Characters are specific, not generic
   - Carry unique traits into every scene

2. ATTRIBUTE (10%) - "A characteristic feature that separates from others"
   - Visual/behavioral details that distinguish
   - Consistent across the narrative

3. ACTION (10%) - "A happening done by a character"
   - Characters DO things, not just experience
   - Actions reveal character

4. OBJECT (10%) - "A 'something' that carries an attribute"
   - Important items have significance
   - Objects serve narrative purpose

5. LOCATION (10%) - "The setting where actions happen"
   - Places are specific, affect events
   - Geography matters to plot

6. MOMENT (10%) - "A slice of time in the story"
   - Timing matters narratively
   - Dramatic irony from when things happen

7. CORE CONCEPT (10%) - "The foundational 'what if'"
   - Clear premise driving story
   - Consistent exploration of concept

8. METHOD (10%) - "How actions are performed"
   - Specificity in execution
   - Methods reveal character

9. RELATIONSHIP (10%) - "Connections between elements"
   - All elements interconnected
   - Changes ripple through system

10. GOAL (10%) - "The target destination"
    - Clear stakes and objectives
    - Goals drive conflict

COHERENCE TEST: Each scene should engage at least 4 elements meaningfully.

Score 0-1 where:
- 0.9-1.0: All elements working in harmony
- 0.7-0.8: Most elements engaged, minor gaps
- 0.5-0.6: Some elements missing/weak
- 0.0-0.5: Disconnected, incoherent narrative""",
    evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT, LLMTestCaseParams.CONTEXT],
    threshold=0.7,
    model=eval_model,
)

# ============================================
# 6. Gilligan-Martin Quality
# Based on Breaking Bad writers room + GRRM principles
# ============================================
gilligan_martin_metric = GEval(
    name="Gilligan-Martin Quality",
    criteria="""Evaluate using Gilligan Method (Breaking Bad) and Martin Storytelling (GRRM) principles.

GILLIGAN METHOD PRINCIPLES:

1. CONSEQUENCE TRACKING (weight: 20%)
   "What happens next?" applied rigorously
   - Every action has proportional consequence
   - No "get out of jail free" cards
   - Death means something

2. MYSTERY VS CONFUSION (weight: 15%)
   "Make them curious, not confused"
   - Withhold for tension, not for withholding's sake
   - Answers raise new questions
   - Reader knows what they don't know

3. SPECIFICITY (weight: 20%)
   "I am the one who knocks" vs "I'm dangerous"
   - Concrete details over abstractions
   - Memorable phrasing
   - Visual specificity

4. SHOW DON'T TELL (weight: 15%)
   - Actions reveal character
   - Subtext over text
   - Visual/behavioral storytelling

MARTIN (GRRM) PRINCIPLES:

5. MORAL COMPLEXITY (weight: 15%)
   "The villain is the hero of their own story"
   - No pure good/evil
   - Everyone believes they're justified
   - Reader can understand all sides

6. HUMAN HEART IN CONFLICT (weight: 15%)
   - Internal struggles drive external plot
   - Choices define character
   - Transformation arcs are earned

RED FLAGS (automatic point deduction):
- Coincidental timing saving characters (-0.2)
- Villain monologuing exposition (-0.2)
- "As you know, Bob" dialogue (-0.1)
- Deus ex machina resolution (-0.3)
- Plot armor protecting favorites (-0.2)

Score 0-1 where:
- 0.9-1.0: Could air on HBO/AMC prestige series
- 0.7-0.8: Professional TV quality
- 0.5-0.6: Network television quality
- 0.0-0.5: Below broadcast standards""",
    evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT, LLMTestCaseParams.CONTEXT],
    threshold=0.7,
    model=eval_model,
)

# ============================================
# All 6 Storyteller Metrics
# ============================================
ALL_METRICS = [
    eq_bench_magic_metric,       # EQ-Bench Magic Score
    anti_slop_metric,            # Anti-Slop Score
    eq_bench_consistency_metric, # EQ-Bench Consistency
    mazur_voice_metric,          # Mazur Character Voice
    mazur_narrative_metric,      # Mazur Narrative Coherence
    gilligan_martin_metric,      # Gilligan-Martin Quality
]

METRIC_NAMES = [m.name for m in ALL_METRICS]

def get_metrics_by_name(names: list[str] | None = None):
    """Get metrics filtered by name, or all metrics if names is None."""
    if names is None:
        return ALL_METRICS
    return [m for m in ALL_METRICS if m.name in names]
