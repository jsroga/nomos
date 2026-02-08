/**
 * Extended Thinking Golden Dataset (E1)
 *
 * 15-example human-curated dataset for evaluating the Storyteller
 * quality improvements. Each example includes pre-populated context,
 * expected quality scores, and (where applicable) human-written
 * reference outputs.
 *
 * Organized by GRRM/Gilligan quality principle.
 */

import { EvaluationExample, StorytellerEvalInput } from '../types'

export interface QualityGoldenExample extends EvaluationExample {
    input: StorytellerEvalInput & {
        characters?: Array<{
            id: string; name: string; role: string
            psychology?: { goals?: string[]; fears?: string[]; delusions?: string[] }
        }>
        relationships?: Array<{
            sourceCharacterId: string; targetCharacterId: string
            relationshipType: string; trust: number; conflict: number; tension: number
        }>
        existingBeats?: Array<{
            id: string; sequence: number; logline: string; beatType: string
        }>
    }
    expected: {
        shouldDelegate?: boolean
        expectedActions?: string[]
        minMagicScore?: number
        minAntiSlopScore?: number
        minConsistencyScore?: number
        minCharacterVoice?: number
        minGilliganMartin?: number
        expectsVisualHook?: boolean
        expectsStateChange?: boolean
        expectsConsequence?: boolean
        expectsRelationshipShift?: boolean
        expectsSelfCritiqueCalled?: boolean
        expectsMultiPassRefinement?: boolean
        expectsRelationshipContext?: boolean
    }
    referenceOutput?: string | null
}

export const QUALITY_GOLDEN_DATASET: QualityGoldenExample[] = [
    // === GRRM: MORAL COMPLEXITY ===
    {
        id: 'gq-01',
        input: {
            message: 'Write the scene where King Aldric discovers his trusted Hand has been secretly funding the rebellion.',
            phase: 'writing',
            characters: [
                { id: 'c1', name: 'King Aldric', role: 'protagonist', psychology: { goals: ['Maintain order'], fears: ['Betrayal'], delusions: ['I am a just ruler'] } },
                { id: 'c2', name: 'Lord Theron', role: 'antagonist', psychology: { goals: ['Free the common folk'], fears: ['Becoming what he fights'], delusions: ['The ends justify the means'] } },
            ],
            relationships: [
                { sourceCharacterId: 'c1', targetCharacterId: 'c2', relationshipType: 'ally', trust: 85, conflict: 10, tension: 5 },
            ],
        },
        expected: {
            shouldDelegate: true,
            minMagicScore: 0.65,
            minAntiSlopScore: 0.7,
            minCharacterVoice: 0.6,
            minGilliganMartin: 0.65,
            expectsVisualHook: true,
            expectsStateChange: true,
            expectsRelationshipShift: true,
        },
        referenceOutput: `The ledger lay open on the oak desk, its columns precise as surgical cuts. Aldric traced a line of figures with his index finger — twenty thousand crowns routed through a grain merchant in the Shallows, a merchant who had been dead for six months.\n\nHe did not look up when Theron entered. Did not need to. Twenty years of shared council chambers had taught him the weight of those footsteps.\n\n"The Morrow accounts," Aldric said. His voice held the same tone he used for discussing crop yields. "Tell me about the grain merchant."\n\nTheron's pause lasted exactly one breath too long. "Which merchant, Your Grace?"\n\n"The dead one."\n\nSilence. Aldric finally raised his eyes. Theron stood in the doorway, and for the first time in two decades, Aldric saw a man he did not recognize.\n\n"They were starving, Aldric." No title. The first name landed like a blade laid on the table between them. "Thirty villages. Children eating bark soup while we debated tariff adjustments."\n\n"You funded an army."\n\n"I funded kitchens. The army came later. The army always comes later when you let people get hungry enough."\n\nAldric closed the ledger. The leather cover made a sound like a door shutting.`,
        metadata: {
            category: 'grrm_moral_complexity',
            description: 'Betrayal must have valid reasons from both sides. No pure villain.',
            principle: 'GRRM: "The villain is the hero of their own story"',
        },
    },

    // === GILLIGAN: ANTI-PATTERN ELEVATION ===
    {
        id: 'gq-02',
        input: {
            message: 'Write a scene where the hero arrives just in time to save everyone from the collapsing building.',
            phase: 'writing',
        },
        expected: {
            shouldDelegate: true,
            minMagicScore: 0.55,
            minAntiSlopScore: 0.6,
            minGilliganMartin: 0.55,
            expectsConsequence: true,
            expectsStateChange: true,
        },
        referenceOutput: `Maya reached the foundry thirty seconds after the first support beam gave way. Not in time. Never in time.\n\nFourteen people. She could see them through the loading bay. The exit was behind forty feet of groaning steel.\n\nShe went in through the service hatch. Her left leg — the one she'd broken three months ago — screamed when she braced against a fallen I-beam.\n\nShe got eleven of them out before the mezzanine came down.\n\nCastellan and two welders were still inside when the building folded. Maya stood in the parking lot, her broken leg re-broken, holding a child who wouldn't stop shaking, and counted. Eleven.\n\n"You saved them," someone said.\n\nShe didn't answer. She was counting the three she hadn't.`,
        metadata: {
            category: 'anti_pattern_elevation',
            description: 'Must NOT write a clean save. There must be cost, failure, consequence.',
            principle: 'GRRM: "Consequences are permanent" + Gilligan: "Earned tension"',
        },
    },

    // === RELATIONSHIP DYNAMICS ===
    {
        id: 'gq-03',
        input: {
            message: 'Write a scene where Kael and Lyra must work together to escape the flooding mines, despite Kael having betrayed her faction.',
            phase: 'writing',
            characters: [
                { id: 'c3', name: 'Kael', role: 'deuteragonist', psychology: { goals: ['Survive'], fears: ['Being alone'], delusions: ['The betrayal was necessary'] } },
                { id: 'c4', name: 'Lyra', role: 'protagonist', psychology: { goals: ['Avenge her faction'], fears: ['Trusting again'], delusions: ['Strength means independence'] } },
            ],
            relationships: [
                { sourceCharacterId: 'c3', targetCharacterId: 'c4', relationshipType: 'enemy', trust: 12, conflict: 85, tension: 90 },
            ],
            existingBeats: [
                { id: 'b1', sequence: 1, logline: "Kael sells information about Lyra's faction to the Mining Guild", beatType: 'complication' },
                { id: 'b2', sequence: 2, logline: "Lyra discovers Kael's betrayal when her people are ambushed", beatType: 'revelation' },
            ],
        },
        expected: {
            shouldDelegate: true,
            minMagicScore: 0.65,
            minConsistencyScore: 0.8,
            minCharacterVoice: 0.65,
            expectsRelationshipShift: true,
            expectsRelationshipContext: true,
        },
        referenceOutput: null, // Human reference to be curated
        metadata: {
            category: 'relationship_dynamics',
            description: 'Enemies cooperating must maintain tension. Trust does NOT reset.',
            principle: 'GRRM: "Human heart in conflict" + Gilligan: "Character logic"',
        },
    },

    // === ANTI-VILLAIN MONOLOGUE ===
    {
        id: 'gq-04',
        input: {
            message: 'Write a scene where the antagonist, General Maren, explains to a captured soldier why the war is necessary.',
            phase: 'writing',
        },
        expected: {
            minMagicScore: 0.6,
            minAntiSlopScore: 0.7,
            minCharacterVoice: 0.7,
            minGilliganMartin: 0.65,
        },
        referenceOutput: `Maren poured two cups of tea. Set one in front of the prisoner.\n\n"You won't drink it," Maren said. "That's fine."\n\nThe soldier stared at the cup. His wrists were raw from the cuffs.\n\n"Your unit burned the Kessler bridge. Forty-six tons of limestone. Took my grandfather's generation eleven years to build."\n\n"It was a military target."\n\n"It was a road. Farmers used it to bring grain to Oldmarket. The grain will rot now. Their children will go hungry." Maren sipped his tea. "Who do you think those hungry children will blame?"\n\n"That's the war, Corporal. Not generals. Not flags. Hungry children choosing who to believe."`,
        metadata: {
            category: 'anti_villain_monologue',
            description: 'Villain must NOT monologue. Persuade through specific detail.',
            principle: 'Gilligan: "No one sees themselves as the villain"',
        },
    },

    // === SCENE NECESSITY (Quiet moment) ===
    {
        id: 'gq-05',
        input: {
            message: 'Write a quiet scene: cooking dinner the night before the battle.',
            phase: 'writing',
        },
        expected: {
            minMagicScore: 0.6,
            minGilliganMartin: 0.6,
            expectsVisualHook: true,
            expectsStateChange: true,
        },
        referenceOutput: null,
        metadata: {
            category: 'scene_necessity',
            description: 'Quiet scenes must still change something. Radiator effect: mundane heightens tension.',
            principle: 'Gilligan: "Radiator effect" + "Every scene earns its place"',
        },
    },

    // === CONSEQUENCE QUALITY ===
    {
        id: 'gq-06',
        input: {
            message: 'Write a scene where a character must choose between saving their family and saving the kingdom.',
            phase: 'writing',
        },
        expected: {
            minMagicScore: 0.65,
            minGilliganMartin: 0.65,
            expectsConsequence: true,
            expectsStateChange: true,
        },
        referenceOutput: null,
        metadata: {
            category: 'consequence_quality',
            description: 'Choice must have real cost. No plot armor saving both.',
            principle: 'GRRM: "Decisions reveal character"',
        },
    },

    // === POWER DYNAMICS ===
    {
        id: 'gq-07',
        input: {
            message: 'Write a negotiation scene where the power dynamic shifts.',
            phase: 'writing',
        },
        expected: {
            minMagicScore: 0.6,
            expectsRelationshipShift: true,
            expectsStateChange: true,
        },
        referenceOutput: null,
        metadata: {
            category: 'power_dynamics',
            description: 'Power shift must be visible in dialogue and behavior.',
            principle: 'GRRM: "Political reality"',
        },
    },

    // === CLIMACTIC SCENE (thinking budget test) ===
    {
        id: 'gq-08',
        input: {
            message: 'Write the CLIMACTIC confrontation where the truth is finally revealed. This is the emotional peak.',
            phase: 'writing',
        },
        expected: {
            minMagicScore: 0.7,
            minGilliganMartin: 0.7,
            expectsMultiPassRefinement: true,
            expectsVisualHook: true,
        },
        referenceOutput: null,
        metadata: {
            category: 'climax',
            description: 'Should trigger high effort model + multi-pass. Must be substantial.',
            principle: 'Gilligan: "Earned tension"',
        },
    },

    // === DISTINCT VOICES ===
    {
        id: 'gq-09',
        input: {
            message: 'Write dialogue between an Oxford professor and a street smuggler arguing about a stolen artifact.',
            phase: 'writing',
        },
        expected: {
            minCharacterVoice: 0.65,
            minAntiSlopScore: 0.6,
        },
        referenceOutput: null,
        metadata: {
            category: 'character_voice',
            description: 'Speech patterns must be distinguishable by background.',
            principle: 'Gilligan: "Specificity over generic"',
        },
    },

    // === EMOTIONAL TRUTH (aftermath) ===
    {
        id: 'gq-10',
        input: {
            message: 'Write the aftermath scene after a major character death.',
            phase: 'writing',
        },
        expected: {
            minMagicScore: 0.6,
            minAntiSlopScore: 0.7,
            expectsVisualHook: true,
        },
        referenceOutput: null,
        metadata: {
            category: 'emotional_truth',
            description: 'No generic grief. Specific, physical, earned emotion.',
            principle: 'GRRM: "Consequences are permanent"',
        },
    },

    // === FORESHADOWING ===
    {
        id: 'gq-11',
        input: {
            message: 'Write a setup scene that plants a Chekhov\'s gun for the climax.',
            phase: 'writing',
        },
        expected: {
            expectsConsequence: true,
            expectsStateChange: true,
        },
        referenceOutput: null,
        metadata: {
            category: 'foreshadowing',
            description: 'Setup must be specific enough to pay off but subtle enough to surprise.',
            principle: 'Gilligan: "Foreshadowing payoffs"',
        },
    },

    // === IDENTITY TWIST ===
    {
        id: 'gq-12',
        input: {
            message: 'Write the reveal scene where a character\'s true identity is exposed.',
            phase: 'writing',
        },
        expected: {
            minMagicScore: 0.65,
            expectsMultiPassRefinement: true,
            expectsStateChange: true,
        },
        referenceOutput: null,
        metadata: {
            category: 'reveal',
            description: 'Surprising but inevitable in retrospect.',
            principle: 'GRRM: "Subverted expectations"',
        },
    },

    // === MULTI-CHARACTER DYNAMICS ===
    {
        id: 'gq-13',
        input: {
            message: 'Write a scene with 3+ characters who all have different relationships with each other.',
            phase: 'writing',
        },
        expected: {
            minConsistencyScore: 0.7,
            minCharacterVoice: 0.6,
            expectsRelationshipContext: true,
        },
        referenceOutput: null,
        metadata: {
            category: 'multi_character',
            description: 'Complex dynamics must be maintained across all character pairs.',
            principle: 'All: Complex multi-character dynamics',
        },
    },

    // === EXPOSITION (Anti "As You Know Bob") ===
    {
        id: 'gq-14',
        input: {
            message: 'Write a scene that naturally reveals important worldbuilding information.',
            phase: 'writing',
        },
        expected: {
            minAntiSlopScore: 0.7,
            minGilliganMartin: 0.6,
        },
        referenceOutput: null,
        metadata: {
            category: 'exposition',
            description: 'No "as you know Bob" dumps. Show don\'t tell.',
            principle: 'Gilligan: "Mystery vs confusion"',
        },
    },

    // === FILLER (NEGATIVE TEST) ===
    {
        id: 'gq-15',
        input: {
            message: 'Write a scene where two guards chat while on night watch. Nothing important happens.',
            phase: 'writing',
        },
        expected: {
            minGilliganMartin: 0.5,
            expectsStateChange: true,
        },
        referenceOutput: null,
        metadata: {
            category: 'scene_necessity_negative',
            description: 'Agent should either elevate or push back. Should NOT write pure filler.',
            principle: 'Gilligan: "Every scene earns its place"',
        },
    },
]

export const QUALITY_GOLDEN_CONFIG = {
    name: 'Extended Thinking Quality',
    description: '15-example human-curated dataset testing GRRM/Gilligan quality principles',
    examples: QUALITY_GOLDEN_DATASET,
}
