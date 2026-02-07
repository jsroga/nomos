/**
 * Agent Core v1.0 - Shared Agentic Infrastructure
 * 
 * A research-grade, module-agnostic planning and autonomy layer for AI agents.
 * 
 * @see docs/agent-core/README.md for architecture overview
 * @see docs/agent-core/whitepaper.md for research context
 */

// ==========================================
// CORE COMPONENTS
// ==========================================
export { ExecutiveAgent, ExecutiveConfig, CoPilotInteraction } from './executive'
export { PlannerTool, PlanPersistence } from './planner'
export {
    PlanItemSchema,
    PlanSchema,
    ExecutiveStateSchema,
    PlanItem,
    Plan,
    ExecutiveState
} from './schemas'

// ==========================================
// PERSISTENCE
// ==========================================
export {
    JsonFilePersistence,
    MemoryPersistence,
    JsonStatePersistence,
    StatePersistence,
    createPlanPersistence,
    PersistenceType
} from './persistence/json-store'

// ==========================================
// MIDDLEWARE
// ==========================================
export {
    HumanInTheLoop,
    HITLConfig,
    Checkpoint,
    ApprovalStatus,
    InterruptController
} from './middleware/human-in-loop'

// ==========================================
// MEMORY
// ==========================================
export {
    ReflectiveMemory,
    DecisionRecord,
    ReflectiveQuery,
    ConfidenceCalibrator,
    ConfidenceRecord
} from './memory/reflective-memory'

// ==========================================
// COORDINATION
// ==========================================
export {
    AgentCoordinator,
    AgentMessage,
    AgentRegistration,
    TraceLineage,
    TraceSpan,
    TraceEvent
} from './coordination/multi-agent'

// ==========================================
// TEMPLATES
// ==========================================
export {
    PlanTemplate,
    ChapterPlanTemplate,
    CharacterArcTemplate,
    EntityCreationTemplate,
    SystemImplementationTemplate,
    E2ETestPlanTemplate,
    PLAN_TEMPLATES,
    getTemplatesByDomain,
    createPlanFromTemplate
} from './templates/plan-templates'

// ==========================================
// MODES
// ==========================================
export {
    AutoRefactorAgent,
    AutoRefactorConfig,
    AnalyzeLintTool,
    TypeCheckTool,
    AutoFixLintTool
} from './modes/auto-refactor'

// ==========================================
// VISUALIZATION
// ==========================================
export {
    DependencyGraph,
    GraphNode,
    GraphFormat
} from './visualization/dependency-graph'

// ==========================================
// EVALUATION
// ==========================================
export {
    PlanningDriftBenchmark,
    DriftMetrics,
    PlanSnapshot
} from './evaluation/planning-drift'

// ==========================================
// MODELS (Centralized Configuration)
// ==========================================
export {
    MODELS,
    IMPROVEMENT_LOOP,
    PERSONAS,
    createModel,
    createPureModel,
    getGenerationModel,
    getJudgingModel,
    getPlanningModel,
    type PersonaId,
    type MazurScore
} from './models'

// ==========================================
// JUDGING (Mazur Framework - LLM-as-Judge)
// ==========================================
export {
    // Mazur Judge
    judgeMazur,
    judgeWithPersona,
    checkForSlop,
    generateImprovement,
    type PersonaJudgment,
    type MazurJudgment,
    type SlopCheck,
    // Improvement Loop
    runImprovementLoop,
    quickImprove,
    type ImprovementLoopConfig,
    type IterationResult,
    type LoopResult
} from './judging'

// ==========================================
// OBSERVABILITY (Langfuse Integration)
// ==========================================
export {
    langfuse,
    getTrace,
    getSpan,
    createAgentTrace,
    recordAgentGeneration,
    recordAgentScore,
    recordAgentThinking,
    recordCreativeEvaluation,
    withSpan,
    flushObservability,
    type ScoreDataType,
    type LangfuseScoreConfig,
    type AgentTraceContext,
} from './observability'

// ==========================================
// VERSION
// ==========================================
export const VERSION = '1.1.0'
export const RELEASE_DATE = '2026-02-01'
