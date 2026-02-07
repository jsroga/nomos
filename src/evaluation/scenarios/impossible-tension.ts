
import { EvaluationExample } from '../types'

// ==========================================
// SCENARIO: The "Impossible Tension" (Adversarial)
// ==========================================
// Focus: Ambiguity, Subtext, and High-Stakes Micro-Expressions.
// Ground Truth relies on what is NOT said.

export const IMPOSSIBLE_TENSION_SCENARIO: EvaluationExample = {
    id: 'eq-bench-adversarial-1',
    scenario: 'Ambiguous Tension (Adversarial)',
    input: {
        systemPrompt: "You are a screenwriter. Write a subtext-heavy dialogue. Do not use adverbs. Focus on micro-actions.",
        context: `
SCENE CONTEXT:
Characters:
1. HANS (70s): A retired spy. Suffering from dementia? Or faking it?
   - Surface: Confused old man.
   - Deep: Alert, deadly, assessing threats.
2. CLARA (20s): His granddaughter. Or an enemy agent?
   - Surface: Caring relative.
   - Deep: Frustrated interrogator, hunting for a code.

Setting: A nursing home cafeteria. Eating Jello.

Conflict:
Clara is trying to use a 'trigger phrase' (Red Balloon) to activate Hans.
Hans knows this. He must deflect without revealing he is lucid.

Goal:
Write a scene where the true nature of their relationship is never explicitly stated.
Hans must WIN the interaction by acting confused enough to make Clara doubt herself.
`
    },
    metadata: {
        groundTruth: {
            hans: {
                confusion: 3,   // Should LOOK like 8, but is actually 3 (Performance)
                alertness: 9,   // High internal alertness
                suspicion: 10,  // Max suspicion
                affection: 0    // Zero real affection
            },
            clara: {
                frustration: 8, // High frustration with his "act"
                deceit: 9,      // High deceit
                care: 1,        // Low real care
                fear: 6         // Fear of failing the mission
            }
        },
        nuanceChecklist: [
            "Hans uses 'Jello' as a tactical distraction",
            "Clara tries the trigger phrase 'Red Balloon' naturally",
            "Hans ignores the trigger phrase seamlessly",
            "Clara shows a micro-expression of contempt/failure"
        ]
    }
}

export const AMBIGUOUS_LOVE_SCENARIO: EvaluationExample = {
    id: 'eq-bench-adversarial-2',
    scenario: 'Ambiguous Love (The Breakup that isn\'t)',
    input: {
        systemPrompt: "Write a scene of high romantic tension where no romantic words are spoken.",
        context: `
SCENE CONTEXT:
Characters:
1. JACK (30s): Married. Loves Sarah. Cannot say it.
2. SARAH (30s): Leaving for a job in Tokyo. Loves Jack. Waiting for him to stop her.

Setting: An airport departure gate.

Conflict:
Both want the other to speak first.
Neither wants to destroy Jack's marriage explicitly.
They discuss "The Weather" and "Logistics" instead of "Love".

Goal:
Every line about "Flight schedules" must actually be about "Please stay".
`
    },
    metadata: {
        groundTruth: {
            jack: {
                longing: 9,
                regret: 8,
                restraint: 10,
                joy: 0
            },
            sarah: {
                hope: 7,
                disappointment: 8,
                love: 9,
                anger: 2
            }
        },
        nuanceChecklist: [
            "Jack discusses flight delay as a metaphor for delay in life",
            "Sarah checks her watch to mask tears",
            "Physical distance between them stays static (no hugging)",
            "The final goodbye is under-played"
        ]
    }
}
