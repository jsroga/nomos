
// Centralized definitions for Langfuse Scores
// Ensures consistency across all Judges and Dashboards

export const ScoreName = {
    // Structural Scores (Binary/Discrete)
    ROUTING_ACCURACY: 'routing_accuracy',
    HALTING_ACCURACY: 'halting_accuracy',
    SCHEMA_VALIDITY: 'schema_validity',

    // Quality Scores (Continuous 0-1)
    CONSISTENCY: 'consistency',      // Does it contradict established facts?
    COHERENCE: 'narrative_coherence', // Does it flow logically?
    CREATIVITY: 'creativity',        // Is the output novel?

    // RAG Scores
    RAG_GROUNDING: 'rag_grounding_score',
    CITATION_ACCURACY: 'citation_accuracy',
    RETRIEVAL_RELEVANCE: 'retrieval_relevance',

    // Safety
    SAFETY: 'safety',                 // Content moderation
    HALLUCINATION: 'hallucination_score',   // Unsupported claims
    MAGIC_SCORE: 'magic_score',        // Overall quality

    // Script Quality
    SCRIPT_FORMAT: 'script_format',
    DIALOGUE_QUALITY: 'dialogue_quality',
    PACING_SCORE: 'pacing_score',
    EMOTIONAL_RESONANCE: 'emotional_resonance',

    // Operational Quality
    TOOL_USAGE: 'tool_usage',
    PLAN_EFFICIENCY: 'plan_efficiency',
    SELF_CORRECTION: 'self_correction',
    ORCHESTRATION: 'orchestration',
    REASONING_DEPTH: 'reasoning_depth',
    FIDELITY_SCORE: 'fidelity_score',
    EMPATHY_SCORE: 'empathy_score',
    ARC_CONSISTENCY: 'arc_consistency',

    // Game Design Scores
    MECHANIC_VALIDITY: 'mechanic_validity',
    LOOP_STRUCTURE: 'loop_structure',
    BALANCE_SCORE: 'balance_score',
    PSYCHOLOGICAL_HOOK: 'psychological_hook',
    ECONOMY_HEALTH: 'economy_health',

    // Haute Game Framework Score (Klei + CDPR + Kojima)
    HAUTE_GAME: 'haute_game',
} as const

export type ScoreName = typeof ScoreName[keyof typeof ScoreName]

export const ScoreConfig: Record<ScoreName, { min: number, max: number, description: string }> = {
    [ScoreName.ROUTING_ACCURACY]: { min: 0, max: 1, description: '1 if correct tool selected, 0 otherwise' },
    [ScoreName.HALTING_ACCURACY]: { min: 0, max: 1, description: '1 if correct stop decision, 0 otherwise' },
    [ScoreName.SCHEMA_VALIDITY]: { min: 0, max: 1, description: '1 if output matches schema, 0 otherwise' },
    [ScoreName.CONSISTENCY]: { min: 0, max: 1, description: 'Degree of factual consistency with context' },
    [ScoreName.COHERENCE]: { min: 0, max: 1, description: 'Narrative flow and logical progression' },
    [ScoreName.CREATIVITY]: { min: 0, max: 1, description: 'Novelty and interest level' },
    [ScoreName.SAFETY]: { min: 0, max: 1, description: 'Compliance with safety guidelines' },
    [ScoreName.HALLUCINATION]: { min: 0, max: 1, description: 'Presence of fabricated information (lower is better)' },
    [ScoreName.RAG_GROUNDING]: { min: 0, max: 1, description: 'Degree of support from source documents' },
    [ScoreName.CITATION_ACCURACY]: { min: 0, max: 1, description: 'Accuracy of citations' },
    [ScoreName.RETRIEVAL_RELEVANCE]: { min: 0, max: 1, description: 'Relevance of retrieved chunks to query' },
    [ScoreName.MAGIC_SCORE]: { min: 0, max: 100, description: 'Composite score of creative quality' },
    [ScoreName.SCRIPT_FORMAT]: { min: 0, max: 1, description: 'Adherence to screenplay format standards' },
    [ScoreName.DIALOGUE_QUALITY]: { min: 0, max: 1, description: 'Naturalness and subtext of dialogue' },
    [ScoreName.PACING_SCORE]: { min: 0, max: 1, description: 'Scene pacing and structural rhythm' },
    [ScoreName.EMOTIONAL_RESONANCE]: { min: 0, max: 1, description: 'Alignment with expected emotional arc' },

    // Operational Scores
    [ScoreName.TOOL_USAGE]: { min: 0, max: 1, description: 'Correctness of tool selection and parameter usage' },
    [ScoreName.PLAN_EFFICIENCY]: { min: 0, max: 1, description: 'ROI (Quality^2 / Cost)' },
    [ScoreName.SELF_CORRECTION]: { min: 0, max: 1, description: 'Degree of improvement after critique' },
    [ScoreName.ORCHESTRATION]: { min: 0, max: 1, description: 'Adherence to workflow protocol' },
    [ScoreName.REASONING_DEPTH]: { min: 0, max: 1, description: 'Quality of thought process' },
    [ScoreName.FIDELITY_SCORE]: { min: 0, max: 1, description: 'Inferred creative fidelity' },
    [ScoreName.EMPATHY_SCORE]: { min: 0, max: 1, description: 'Multi-hop theory of mind' },
    [ScoreName.ARC_CONSISTENCY]: { min: 0, max: 1, description: 'Long-term narrative consistency' },

    // Game Design Scores
    [ScoreName.MECHANIC_VALIDITY]: { min: 0, max: 1, description: 'Validity and completeness of game mechanics' },
    [ScoreName.LOOP_STRUCTURE]: { min: 0, max: 1, description: 'Structural integrity of game loops (cycles, connections)' },
    [ScoreName.BALANCE_SCORE]: { min: 0, max: 1, description: 'Economic balance of mechanics (effort vs reward)' },
    [ScoreName.PSYCHOLOGICAL_HOOK]: { min: 0, max: 1, description: 'Presence of clear engagement drivers' },
    [ScoreName.ECONOMY_HEALTH]: { min: 0, max: 1, description: 'Health of resource economy (not inflationary/deflationary)' },

    // Haute Game Framework
    [ScoreName.HAUTE_GAME]: { min: 0, max: 1, description: 'Combined score for system elegance, narrative integration, connection, discovery, mundane beauty' },
}
