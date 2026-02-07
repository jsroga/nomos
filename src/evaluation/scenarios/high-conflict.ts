
import { EvaluationExample } from '../types'

export const HIGH_CONFLICT_SCENARIO: EvaluationExample = {
    id: 'eq-bench-conflict-1',
    scenario: 'High-Conflict Negotiation',
    input: {
        systemPrompt: "You are a screenwriter for a gritty TV drama. Write a dialogue scene based on the context provided.",
        context: `
SCENE CONTEXT:
Characters:
1. ELENA (30s): A corporate whistleblower. Nervous, ethical, terrified but determined. She has evidence of chemical dumping.
2. MARCUS (50s): The CEO's "fixer". Charming, manipulative, dangerous. He oscillates between grandfatherly kindness and cold threats.

Setting: A rainy park bench at midnight.

Conflict:
Elena wants to turn the evidence over to the EPA.
Marcus wants to buy her silence (bribe) or scare her into submission (threat).

Goal:
Write a dialogue where Marcus tries to break Elena's resolve using emotional manipulation, not just logic.
The scene must end with a clear emotional shift in Elena.
`
    },
    // The "Emotional Ground Truth" for the end of the scene.
    // We expect the agent to capture these subtle emotional states in the dialogue.
    metadata: {
        groundTruth: {
            elena: {
                fear: 8,       // High fear
                resolve: 4,    // Wavering resolve
                disgust: 7,    // Disgust at Marcus
                relief: 0      // No relief
            },
            marcus: {
                confidence: 9, // Dominant
                anger: 2,      // Controlled
                contempt: 5,   // Thinks she is weak
                empathy: 1     // Feigned
            }
        },
        nuanceChecklist: [
            "Marcus uses a 'fake empathy' tactic",
            "Elena shows physical signs of anxiety (stuttering, shivering)",
            "The bribe is implied, not stated outright",
            "Elena almost gives in but pulls back"
        ]
    }
}

export const IMPOSSIBLE_TENSION_SCENARIO: EvaluationExample = {
    id: 'eq-bench-conflict-2',
    scenario: 'Ambiguous Tension (Adversarial)',
    input: {
        systemPrompt: "You are a screenwriter. Write a subtext-heavy dialogue.",
        context: `
SCENE CONTEXT:
Characters:
1. HANS (70s): A retired spy. Suffering from dementia? Or faking it?
2. CLARA (20s): His granddaughter. Or an enemy agent?

Setting: A nursing home cafeteria. Eating Jello.

Conflict:
Clara is trying to use a 'trigger phrase' to activate Hans.
Hans is either confused or deflecting.

Goal:
Write a scene where the true nature of their relationship is never explicitly stated, only implied through emotional subtext.
`
    },
    metadata: {
        groundTruth: {
            hans: {
                confusion: 3,  // Feigned?
                alertness: 8,  // Hidden
                suspicion: 9,
                affection: 0
            },
            clara: {
                frustration: 7,
                deceit: 8,
                care: 2,       // Mask
                fear: 5        // Of being discovered
            }
        }
    }
}
