import { createStorytellerAgent } from '@/domains/storyteller/agents/v2'
import { v4 as uuidv4 } from 'uuid'
import { db } from '@/lib/db'
import { projects, storyPlans } from '@/domains/storyteller/db/schema'
import { eq } from 'drizzle-orm'
import { EventEmitter } from 'node:events'
import { BibleSection, ActionType } from '@/domains/storyteller/enums'
import {
  processToolResultToAction,
  getActionTypeForSection,
} from '@/domains/storyteller/config/action-config'
import { budgetContext, type RawContextParts } from '@/domains/storyteller/context/token-budget'

// Node.js Runtime required for Mastra core dependencies
export const runtime = 'nodejs'

// Import Langfuse observability with enhanced tracing
import {
  langfuse,
  isLangfuseEnabled,
  recordToolCall,
  recordError,
  flushObservability,
} from '@/agent-core/observability'
import { getErrorMessage } from '@/lib/error-utils'

// Use the imported langfuse client if enabled
const langfuseClient = isLangfuseEnabled ? langfuse : null

// Safe RAG service wrapper
async function getRAGContext(projectId: string, query: string): Promise<string> {
  try {
    const { ragService } = await import('@/domains/storyteller/services/rag-service')
    const ragResults = await ragService.assembleAgentContext(projectId, 'showrunner', query)

    let ragContext = ''
    if (ragResults.relevantHistory) {
      ragContext += `\n## RELEVANT HISTORY\n${ragResults.relevantHistory}\n`
    }
    if (ragResults.pastDecisions) {
      ragContext += `\n## PAST DECISIONS\n${ragResults.pastDecisions}\n`
    }
    if (ragResults.userPreferences) {
      ragContext += `\n## USER PREFERENCES\n${ragResults.userPreferences}\n`
    }
    return ragContext
  } catch (e) {
    console.warn('RAG context retrieval failed:', e)
    return ''
  }
}

export async function POST(req: Request) {
  let trace: ReturnType<typeof langfuse.trace> | null = null
  let generation: ReturnType<ReturnType<typeof langfuse.trace>['generation']> | null = null

  try {
    // Security: Require authentication
    const { requireAuth } = await import('@/lib/auth')
    const { verifyProjectAccess, verifyEpisodeAccess } =
      await import('@/domains/storyteller/lib/access-verification')

    const { session } = await requireAuth()
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Parse body parameters
    const {
      message,
      projectId,
      episodeId,
      traceId: bodyTraceId,
      agenticMode,
      currentPhase,
      sessionId: bodySessionId,
      userId,
    } = await req.json()

    // Security: Validate required parameters
    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid message parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Security: Limit message length to prevent abuse
    if (message.length > 10000) {
      return new Response(JSON.stringify({ error: 'Message too long (max 10000 characters)' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Security: Verify project access
    if (projectId && !(await verifyProjectAccess(projectId, session.user.id))) {
      return new Response(JSON.stringify({ error: 'Project not found or access denied' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Security: Verify episode access
    if (episodeId && !(await verifyEpisodeAccess(episodeId, session.user.id))) {
      return new Response(JSON.stringify({ error: 'Episode not found or access denied' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const traceId = req.headers.get('x-trace-id') || bodyTraceId || uuidv4()

    // Generate sessionId for Langfuse session tracking
    // Sessions group multiple traces together for multi-turn conversations
    // @see https://langfuse.com/docs/observability/features/sessions
    // Security: Use session user ID instead of client-provided userId
    const sessionId =
      bodySessionId || `session-${projectId || 'unknown'}-${episodeId || Date.now()}`
    const safeUserId = session.user.id // Always use authenticated user ID

    // Create trace with session context
    if (langfuseClient) {
      try {
        trace = langfuseClient.trace({
          name: 'storyteller-chat',
          id: traceId,
          sessionId, // Links this trace to the session for grouped view in Langfuse
          userId: safeUserId, // Use authenticated user ID
          metadata: {
            projectId,
            episodeId,
            agenticMode,
            source: 'web-ui',
            userEmail: session.user.email, // Track user email for audit
          },
          tags: ['storyteller', 'chat', projectId ? `project:${projectId}` : 'no-project'].filter(
            Boolean
          ),
        })
        console.log(`[Langfuse] Created trace ${traceId} in session ${sessionId}`)
      } catch (e) {
        console.warn('Failed to create Langfuse trace:', e)
      }
    }

    // 1. Fetch FULL Context - Project, Bible, StoryPlan, Characters, Beats
    let contextPrompt = ''

    if (projectId) {
      try {
        // Parallel fetch ALL data for rich context
        const [projectData, storyPlanData, serviceData, ragContext] = await Promise.all([
          // Direct DB fetch for full project data
          db
            .select()
            .from(projects)
            .where(eq(projects.id, projectId))
            .then(r => r[0]),
          // Story plan (separate table)
          db
            .select()
            .from(storyPlans)
            .where(eq(storyPlans.projectId, projectId))
            .then(r => r[0]),
          // Service fetch for characters and beats
          import('@/services/storyteller.service').then(async m => {
            const [charsReq, beatsReq] = await Promise.all([
              m.storytellerService
                .listCharacters({ projectId }, { userId: 'system-bypass' as any })
                .catch(() => ({ characters: [] })),
              episodeId
                ? m.storytellerService
                  .listBeats({ episodeId }, { userId: 'system-bypass' as any })
                  .catch(() => ({ beats: [] }))
                : Promise.resolve({ beats: [] }),
            ])
            return { characters: charsReq.characters || [], beats: beatsReq.beats || [] }
          }),
          // RAG context based on user query
          getRAGContext(projectId, message),
        ])

        const rawBible = (projectData?.seriesBible as Record<string, unknown>) || {}
        const storyPlan = (storyPlanData?.content as Record<string, unknown>) || {}

        // Flatten nested category objects from seriesBible (e.g., 'Setting', 'History', etc.)
        const knownCategories = [
          'General',
          'Setting',
          'History',
          'Magic',
          'Factions',
          'Technology',
          'Culture',
        ]
        const bible: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(rawBible)) {
          if (knownCategories.includes(key) && typeof value === 'object' && value !== null) {
            Object.assign(bible, value)
          } else {
            bible[key] = value
          }
        }

        // masterPrompt is a TOP-LEVEL column on projects table, not nested in seriesBible
        const masterPrompt =
          projectData?.masterPrompt || bible.masterPrompt || storyPlan.masterPrompt || ''
        // Merge characters from DB table AND storyPlan.keyCharacters/cast
        // Users may define cast in the World Bible (stored in storyPlan) before syncing to the characters table
        const dbCharacters = serviceData.characters || []
        const planCast = (storyPlan.cast || storyPlan.keyCharacters || []) as any[]
        const dbNames = new Set(dbCharacters.map((c: any) => c.name?.toLowerCase()))
        const mergedCharacters = [
          ...dbCharacters,
          ...planCast.filter((c: any) => c?.name && !dbNames.has(c.name.toLowerCase())),
        ]
        const characters = mergedCharacters
        const beats = serviceData.beats || []

        // 2. Build context with token budget enforcement
        // Assemble each section separately, then run through budgetContext()
        const systemCtx = `=== IQ 200 CONTEXT ENGINEERING & ENTITY LINKS ===
You are in a high-fidelity creative workspace. To maintain continuity and enable user interaction, you MUST use the following rules for entity references:
1. ENTITY LINKS: Whenever you mention a Character, Faction, World Rule, or Episode, ALWAYS use the format: [Entity Name][entity-id].
   Example: "[Marcus][char-123] challenged the [Council of Seven][faction-456]."
2. CLICKABLE UI: These tags are rendered as clickable links and hover tooltips in the user's interface. Using them makes your intelligence visible and actionable.
3. CONTEXT SYNTHESIS: Use the technical data below to weave a "connected" world. Don't just list facts; synthesize them into a brilliant narrative.
4. IQ 200 REASONING: Your Council of Agents provides raw data; your job as Showrunner is to spot the "out of the box" connections they missed.

=== SYSTEM CONTEXT ===
projectId: ${projectId}
${episodeId ? `episodeId: ${episodeId}` : ''}
currentPhase: ${currentPhase || 'premise'}
IMPORTANT: When calling tools that require projectId, you MUST use: "${projectId}"
${episodeId ? `When calling tools that require episodeId, you MUST use: "${episodeId}"` : ''}
CURRENT STORY PHASE: ${currentPhase || 'premise'}
- premise: Concept planning, world building, episode premise.
- breaking: Plot structure, beat board organization.
- writing: Scripting and dialogue execution.
⚠️ REFERENCE ONLY: Content below is for world/history consistency. When asked to GENERATE, create NEW content.
${masterPrompt ? `\n=== MASTER PROMPT ===\n${masterPrompt}` : ''}
`

        const projectCtx = `=== PROJECT ===
Title: ${projectData?.name || 'Untitled'} | Genre: ${Array.isArray(storyPlan.genre) ? storyPlan.genre.join(', ') : storyPlan.genre || bible.genre || 'Not set'} | Tone: ${Array.isArray(storyPlan.tone) ? storyPlan.tone.join(', ') : storyPlan.tone || bible.tone || 'Not set'} | Theme: ${storyPlan.centralTheme || bible.centralTheme || 'Not set'}

=== EPISODE PREMISE ===
${storyPlan.premise || storyPlan.episodePremise || bible.episodePremise
            ? JSON.stringify(storyPlan.premise || storyPlan.episodePremise || bible.episodePremise)
            : 'No episode premise yet'
          }

=== WORLD ===
${storyPlan.worldDescription || bible.worldDescription || 'No world description yet'}

=== WORLD RULES ===
${Array.isArray(storyPlan.worldRules) && storyPlan.worldRules.length > 0
            ? storyPlan.worldRules
              .map(
                (r: any) =>
                  `- [${r.category || 'General'}] ${r.rule}${r.consequence ? ` → ${r.consequence}` : ''}`
              )
              .join('\n')
            : '(none)'
          }

=== FACTIONS ===
${Array.isArray(storyPlan.factions) && storyPlan.factions.length > 0
            ? storyPlan.factions
              .map((f: any) => {
                const factionId = `faction-${f.id?.slice(0, 8) || f.name.toLowerCase().replace(/\s+/g, '-')}`
                return `- [${f.name}][${factionId}]: ${f.ideology || f.description || 'No description'}`
              })
              .join('\n')
            : '(none)'
          }

=== INSPIRATIONS ===
${storyPlan.inspirations ? `Movies: ${Array.isArray(storyPlan.inspirations.movies) ? storyPlan.inspirations.movies.map((m: any) => (typeof m === 'string' ? m : m.title)).join(', ') : 'None'} | Books: ${Array.isArray(storyPlan.inspirations.books) ? storyPlan.inspirations.books.map((b: any) => (typeof b === 'string' ? b : b.title)).join(', ') : 'None'} | Games: ${Array.isArray(storyPlan.inspirations.games) ? storyPlan.inspirations.games.map((g: any) => (typeof g === 'string' ? g : g.title)).join(', ') : 'None'}` : '(none)'}

=== SEQUENCES ===
${Array.isArray(storyPlan.sequences) && storyPlan.sequences.length > 0
            ? storyPlan.sequences
              .map((s: any, i: number) => `${i + 1}. ${s.name}: ${s.description || ''}`)
              .join('\n')
            : '(none)'
          }`

        // Characters: Increased limit to ensure key cast is included, sorted by role
        const rolePriority: Record<string, number> = {
          'protagonist': 1,
          'hero': 1,
          'main': 1,
          'antagonist': 2,
          'villain': 2,
          'mentor': 3,
          'guide': 3,
          'supporting': 4,
          'side': 5,
        }

        const sortedChars = [...characters].sort((a, b) => {
          const roleA = (a.role || '').toLowerCase()
          const roleB = (b.role || '').toLowerCase()
          const priorityA = rolePriority[roleA] || 99
          const priorityB = rolePriority[roleB] || 99
          if (priorityA !== priorityB) return priorityA - priorityB
          return 0
        })

        const charsCtx =
          sortedChars.length > 0
            ? `=== CHARACTERS (${sortedChars.length}) ===\n` +
            sortedChars
              .slice(0, 20)
              .map((c: any) => {
                const charId = `char-${c.id?.slice(0, 8) || c.name.toLowerCase().replace(/\s+/g, '-')}`
                return `- [${c.name}][${charId}] (${c.role || '?'}): ${c.description || 'No description'}`
              })
              .join('\n')
            : ''

        // Beats: reduced from 8 to 3
        const beatsCtx =
          beats.length > 0
            ? `=== RECENT BEATS (${beats.length}) ===\n` +
            beats
              .slice(-3)
              .map((b: any) => {
                const beatId = `beat-${b.id?.slice(0, 8)}`
                return `- [${b.logline || `Beat ${b.sequence}`}][${beatId}]`
              })
              .join('\n')
            : ''

        // Apply token budget enforcement — truncates any section that exceeds its limit
        const rawParts: RawContextParts = {
          systemPrompt: systemCtx,
          projectContext: projectCtx,
          characters: charsCtx,
          beats: beatsCtx,
          rag: ragContext || undefined,
          userMessage: message,
        }
        const budgeted = budgetContext(rawParts)

        if (budgeted.trimmed.length > 0) {
          console.log('[Stream] Token budget trimmed sections:', budgeted.trimmed)
        }
        console.log(`[Stream] Context tokens: ~${budgeted.totalTokens}`)

        contextPrompt = budgeted.context
      } catch (err) {
        console.warn('Failed to load context for stream:', err)
        try {
          trace?.update({ metadata: { contextError: String(err) } })
        } catch {
          /* ignore */
        }
      }
    }

    const agent = await createStorytellerAgent()

    // No pattern matching - LLM decides what to update via tool calls
    // Section is extracted from the tool result's `keys` array
    let detectedSection: BibleSection = 'full'
    const isSectionUpdate = false // Will be determined by tool call
    const sectionPrompt = '' // No forced section mode

    // Prepend context and AGENTIC INSTRUCTION
    let agenticInstruction = ''
    if (agenticMode) {
      agenticInstruction = `
### GENIUS MODE ENABLED (IQ 200)
You are a Genius Orchestrator. You combine the ruthless realism of George R. R. Martin with the "out of the box" narrative complexity of Vince Gilligan.

1. DO NOT provide a direct response. ALWAYS delegate to the Council of Agents.
2. Demand "out of the box" solutions and IQ 200 creative depth from your Council.
3. If the request is for lore or world-building, the Council is still required for multi-layered thinking.
4. Passage user's request as the 'goal' to the tool.
`
    }

    const promptWithContext = contextPrompt
      ? `${contextPrompt}\n${sectionPrompt}\n${agenticInstruction}\nUSER REQUEST:\n${message}\n\nRemember: Use projectId="${projectId}" for all tool calls that require it.`
      : `${sectionPrompt}\n${agenticInstruction}\n${message}`

    // Create a generation span for the LLM call (safe - won't throw)
    // The generation object is used to create child spans for tool calls
    let generationId: string | undefined
    try {
      if (trace) {
        generation = trace.generation({
          name: 'storyteller-agent-stream',
          input: promptWithContext || '(no prompt provided)', // Ensure never undefined
          model: 'gpt-4o',
          metadata: {
            projectId: projectId || '(no project)',
            episodeId: episodeId || '(no episode)',
          },
        })
        // Capture generation ID for child span linkage
        // Langfuse SDK stores the ID in the 'id' property
        generationId = (generation as any)?.id || (generation as any)?.observationId
        console.log(`[Langfuse] Created generation with ID: ${generationId}`)
      }
    } catch (e) {
      console.warn('Failed to create Langfuse generation:', e)
    }

    // Create EventBus for Workflow Visibility
    // EventEmitter imported at top level to avoid edge runtime issues
    const { workflowContext, WORKFLOW_EVENTS } =
      await import('@/domains/storyteller/utils/workflow-context')
    const eventBus = new EventEmitter()
    const activeSpans = new Map<string, ReturnType<NonNullable<typeof trace>['span']>>() // Track spans by step name

    // Bridge Workflow Events to LangFuse & Logging
    eventBus.on(WORKFLOW_EVENTS.STEP_START, ({ step, agent }) => {
      // 1. LangFuse Span
      try {
        if (trace) {
          const span = trace.span({
            name: `workflow-step: ${step}`,
            metadata: { agent, projectId },
            input: { step },
          })
          activeSpans.set(step, span)
        }
      } catch { } // Safe
    })

    eventBus.on(WORKFLOW_EVENTS.STEP_COMPLETE, ({ step, output }) => {
      // 1. Close LangFuse Span
      try {
        const span = activeSpans.get(step)
        if (span) {
          // Ensure output is never undefined for Langfuse
          const safeOutput = output
            ? typeof output === 'string'
              ? output
              : JSON.stringify(output)
            : '(no output)'
          span.end({ output: safeOutput })
          activeSpans.delete(step)
        }
      } catch { } // Safe
    })

    // Detect generation requests that MUST use tools (no text-only responses)
    const generationKeywords = [
      'soundtrack',
      'music',
      'youtube',
      'track',
      'song',
      'inspiration',
      'book',
      'movie',
      'game',
      'reference',
      'world rule',
      'rule',
      'law',
      'constraint',
      'plot twist',
      'twist',
      'faction',
      'organization',
      'group',
      'character',
      'cast',
      'roadmap',
      'episode',
      'sequence',
      'premise',
      'hook',
      'flaw',
      'stake',
      'generate',
      'create',
      'add',
      'suggest',
      'recommend',
    ]
    const messageLC = message.toLowerCase()
    const isGenerationRequest =
      generationKeywords.some(kw => messageLC.includes(kw)) &&
      (messageLC.includes('generate') ||
        messageLC.includes('create') ||
        messageLC.includes('add') ||
        messageLC.includes('suggest') ||
        messageLC.includes('recommend') ||
        messageLC.includes('give'))

    // Prepare context wrapper with memory for multi-turn conversations
    // See: https://mastra.ai/docs/agents/agent-memory
    const streamOptions: Record<string, unknown> = {
      // Use 'auto' for tool choice - 'required' causes infinite loops
      // The agent prompt already instructs to use tools for generation
      toolChoice: 'auto',
      // Allow up to 5 steps for complex multi-tool workflows
      maxSteps: 5,
      telemetry: {
        isEnabled: true,
        traceId,
        metadata: {
          projectId,
          episodeId,
        },
      },
      // Memory context for conversation persistence
      // resource: stable user/project identifier
      // thread: specific conversation session (per episode or project)
      memory: {
        resource: projectId || 'anonymous',
        thread: episodeId || `project-${projectId}` || 'general',
      },
    }

    // Log generation request detection
    if (isGenerationRequest) {
      console.log('[Stream] Generation request detected')
    }

    // Track existing bible data for "before" comparison in diff viewer
    let existingBibleData: Record<string, unknown> = {}

    // Fetch existing data for diff viewer (no pattern matching - LLM decides what to update)
    if (projectId) {
      try {
        const projectRow = await db
          .select()
          .from(projects)
          .where(eq(projects.id, projectId))
          .then(r => r[0])
        existingBibleData = (projectRow?.seriesBible as Record<string, unknown>) || {}
      } catch (e) {
        console.warn('Failed to fetch existing bible for diff:', e)
      }
    }

    const result = await workflowContext.run({ traceId, sessionId, userId, eventBus }, async () => {
      return agent.stream(promptWithContext, streamOptions)
    })

    // Create SSE stream that useChatStream can parse
    const encoder = new TextEncoder()
    let fullText = ''
    let toolCallSummary: string[] = [] // Track tool calls for Langfuse output
    const toolCallStartTimes = new Map<string, number>() // Track tool call durations for Langfuse

    // Track emitted actions to prevent duplicates (same tool + same section = skip)
    const emittedActionKeys = new Set<string>()

    // Collect actions to emit AFTER final message (better UX - approval appears at end)
    const pendingActions: Record<string, unknown>[] = []

    /**
     * Generate a deduplication key for an action
     * Format: toolName:section:contentHash
     *
     * For beats: use beat ID or title as key
     * For bible sections: use section name + content hash
     */
    function getActionDedupeKey(toolName: string, section: string, payload: Record<string, unknown>): string {
      // For beat management, use beat ID or title for deduplication
      if (toolName === 'manage_beat') {
        const beatId = payload?.id || payload?.beatId || payload?.beat?.id
        const beatTitle = payload?.title || payload?.beat?.title || 'untitled'
        return `manage_beat:${beatId || beatTitle}`
      }

      // For world bible updates, include main content identifiers
      if (toolName === 'update_world_bible') {
        // Create a content-based key using first few chars of stringified payload
        const contentPreview = JSON.stringify(payload || {}).slice(0, 100)
        return `${toolName}:${section}:${contentPreview}`
      }

      // Default: use payload keys
      const payloadKeys = Object.keys(payload || {})
        .sort()
        .join(',')
      return `${toolName}:${section}:${payloadKeys}`
    }

    const stream = new ReadableStream({
      async start(controller) {
        // Track if controller is closed to prevent "Controller is already closed" errors
        let isStreamClosed = false

        // Safe enqueue helper that checks if stream is still open
        const safeEnqueue = (data: string) => {
          if (isStreamClosed) return false
          try {
            controller.enqueue(encoder.encode(data))
            return true
          } catch (e) {
            console.warn('[Stream] Enqueue failed, stream likely closed')
            isStreamClosed = true
            return false
          }
        }

        // Safe close helper
        const safeClose = () => {
          if (isStreamClosed) return
          isStreamClosed = true
          try {
            controller.close()
          } catch (e) {
            console.warn('[Stream] Close failed, already closed')
          }
        }

        // IMMEDIATELY emit section_loading if this is a section update
        if (isSectionUpdate) {
          safeEnqueue(
            `data: ${JSON.stringify({
              type: 'section_loading',
              section: detectedSection,
              loading: true,
              message: `Generating ${detectedSection}...`,
            })}\n\n`
          )
          console.log(`[Stream] Emitted section_loading: ${detectedSection} = true`)
        }

        // Bridge Workflow Events to SSE Stream
        const onStepStart = ({ step, agent }: { step: string; agent?: string }) => {
          safeEnqueue(
            `data: ${JSON.stringify({
              type: 'agent_status',
              agent: agent || 'Storyteller',
              status: 'working',
              message: `${step}...`,
              startTime: Date.now(),
            })}\n\n`
          )
        }

        const onStepComplete = ({ step, output }: { step: string; output?: unknown }) => {
          // Optional: Emit intermediate "thinking" or "result" blocks if desired
          if (output && typeof output === 'string') {
            safeEnqueue(
              `data: ${JSON.stringify({
                type: 'thinking',
                thinking: `[${step} Output]:\n${output.substring(0, 150)}...`,
                agent: 'Storyteller',
              })}\n\n`
            )
          }
        }

        // Handle agent thinking events from specialized agents (Psychologist, Gardener, etc.)
        const onAgentThought = ({ agent, thinking }: { agent: string; thinking: string }) => {
          if (thinking) {
            safeEnqueue(
              `data: ${JSON.stringify({
                type: 'thinking',
                thinking,
                agent,
                timestamp: Date.now(),
              })}\n\n`
            )
          }
        }

        // Handle human-in-the-loop questions from workflow
        const onQuestionAsked = (data: {
          stepId: string
          questionType: string
          question: string
          options: Array<{
            id: string
            label: string
            description?: string
            consequence?: string
            recommended?: boolean
          }>
          traceId?: string
          runId?: string
        }) => {
          // Convert to AgentQuestion format expected by the UI
          const agentQuestion = {
            id: `q-${data.stepId}-${Date.now()}`,
            agentName: 'Writers Room',
            question: data.question,
            questionType: 'single_choice' as const,
            options: data.options,
            context: 'The workflow needs your creative input to proceed.',
            urgency: 'blocking' as const,
            defaultOption: data.options.find(o => o.recommended)?.id,
            timeout: 120, // 2 minutes to decide
          }

          safeEnqueue(
            `data: ${JSON.stringify({
              type: 'questions',
              questions: [agentQuestion],
              workflowStepId: data.stepId,
              workflowRunId: data.runId, // Include runId for resume API
              traceId: data.traceId,
            })}\n\n`
          )

          // Also send awaiting_input to pause the thinking indicator
          safeEnqueue(
            `data: ${JSON.stringify({
              type: 'awaiting_input',
              reason: 'creative_decision',
              workflowRunId: data.runId,
            })}\n\n`
          )
        }

        // Handle workflow suspended event (includes runId)
        const onWorkflowSuspended = (data: {
          runId: string
          stepId: string
          projectId: string
        }) => {
          console.log(`[Stream] Workflow suspended: ${data.runId} at step ${data.stepId}`)
        }

        eventBus.on(WORKFLOW_EVENTS.STEP_START, onStepStart)
        eventBus.on(WORKFLOW_EVENTS.STEP_COMPLETE, onStepComplete)
        eventBus.on(WORKFLOW_EVENTS.AGENT_THOUGHT, onAgentThought)
        eventBus.on(WORKFLOW_EVENTS.QUESTION_ASKED, onQuestionAsked)
        eventBus.on(WORKFLOW_EVENTS.WORKFLOW_SUSPENDED, onWorkflowSuspended)

        try {
          // Send start event
          safeEnqueue(`data: ${JSON.stringify({ type: 'start', traceId })}\n\n`)

          // If this is a section-specific update, emit section_loading event to trigger shimmer
          if (isSectionUpdate) {
            safeEnqueue(
              `data: ${JSON.stringify({
                type: 'section_loading',
                section: detectedSection,
                loading: true,
                message: `Generating ${detectedSection}...`,
              })}\n\n`
            )
          }

          try {
            for await (const part of result.fullStream as any) {
              try {
                const { type, payload } = part || {}
                if (!type) continue

                // Handle stream errors (e.g. OpenAI quota exceeded)
                if (type === 'error') {
                  const errorDetails = payload?.error || payload
                  const errorMessage = errorDetails?.message || 'Unknown stream error'
                  const errorCode = errorDetails?.code || 'STREAM_ERROR'

                  console.error('[Stream] Error chunk received:', errorMessage)

                  safeEnqueue(
                    `data: ${JSON.stringify({
                      type: 'error',
                      error: {
                        message: errorMessage,
                        code: errorCode,
                      },
                    })}\n\n`
                  )

                  safeEnqueue(
                    `data: ${JSON.stringify({
                      type: 'message',
                      message: {
                        sender: 'System',
                        content: `❌ **API Error:** ${errorMessage}`,
                        type: 'error',
                      },
                    })}\n\n`
                  )

                  safeEnqueue(`data: ${JSON.stringify({ type: 'complete' })}\n\n`)
                  safeClose()
                  return
                }

                // Mastra VNext (v0.24+) chunk types
                if (type === 'text-delta') {
                  const text = payload?.text || payload?.textDelta || ''
                  if (text) {
                    fullText += text
                    safeEnqueue(`data: ${JSON.stringify({ type: 'token', token: text })}\n\n`)
                  }
                } else if (type === 'reasoning' || type === 'thinking') {
                  // Extended thinking / chain-of-thought from the model
                  const thinking = payload?.text || payload?.thinking || payload?.reasoning || ''
                  if (thinking) {
                    safeEnqueue(
                      `data: ${JSON.stringify({
                        type: 'thinking',
                        thinking,
                        agent: 'Storyteller',
                      })}\n\n`
                    )
                  }
                } else if (type === 'tool-call') {
                  const toolName = payload?.toolName || 'tool'
                  const toolArgs = payload?.args || {}

                  console.log(`[Stream] Tool call: ${toolName}, args keys:`, Object.keys(toolArgs))

                  // Track tool call for Langfuse output
                  toolCallSummary.push(`Tool: ${toolName}`)

                  // Emit section_loading when update tools are called
                  if (
                    toolName === 'update_world_bible' ||
                    toolName === 'consult_premise_architect'
                  ) {
                    // Try to detect section from tool args - check all known section keys
                    const sectionKeys = [
                      'soundtracks',
                      'worldRules',
                      'factions',
                      'inspirations',
                      'keyCharacters',
                      'worldDescription',
                      'plotTwists',
                      'episodePremise',
                      'episodeRoadmap',
                      'sequences',
                      'premise',
                      'characters',
                      'cast',
                      // Individual premise sections for regeneration
                      'protagonistHook',
                      'fatalFlaw',
                      'stakes',
                      'inevitableConsequence',
                      'theHook',
                      'theTurn',
                      'theAftermath',
                      'transformation',
                      'thematicFocus',
                      'logline',
                      'title',
                    ]

                    // For consult_premise_architect, check task and section args
                    let argSection =
                      toolArgs.section || Object.keys(toolArgs).find(k => sectionKeys.includes(k))

                    // If regenerating a premise section, map to episodePremise for UI shimmer
                    const premiseSections = [
                      'protagonistHook',
                      'fatalFlaw',
                      'stakes',
                      'inevitableConsequence',
                      'theHook',
                      'theTurn',
                      'theAftermath',
                      'transformation',
                      'thematicFocus',
                      'logline',
                      'title',
                    ]
                    if (argSection && premiseSections.includes(argSection)) {
                      console.log(`[Stream] Premise section regeneration detected: ${argSection}`)
                      argSection = 'episodePremise' // Show shimmer on episode premise panel
                    }

                    console.log(`[Stream] Detected section from args: ${argSection || 'none'}`)

                    if (argSection) {
                      // Normalize section name
                      const normalizedSection =
                        argSection === 'characters' || argSection === 'cast'
                          ? 'keyCharacters'
                          : argSection

                      console.log(`[Stream] Emitting section_loading for: ${normalizedSection}`)
                      safeEnqueue(
                        `data: ${JSON.stringify({
                          type: 'section_loading',
                          section: normalizedSection,
                          loading: true,
                        })}\n\n`
                      )
                    }
                  }

                  safeEnqueue(
                    `data: ${JSON.stringify({
                      type: 'agent_status',
                      agent: 'Storyteller',
                      status: 'thinking',
                      message: `Using ${toolName}...`,
                    })}\n\n`
                  )

                  // Track tool call start time for duration calculation
                  toolCallStartTimes.set(toolName, Date.now())
                } else if (type === 'tool-result') {
                  const toolName = payload?.toolName || ''
                  const toolResult = payload?.result
                  console.log(
                    `[Stream] Tool result received: ${toolName}`,
                    typeof toolResult === 'string' ? toolResult.substring(0, 200) : toolResult
                  )

                  // Parse tool result early - needed for both Langfuse and SSE events
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamically parsed JSON from tool results
                  let parsed: any
                  try {
                    parsed = typeof toolResult === 'string' ? JSON.parse(toolResult) : toolResult
                  } catch {
                    parsed = toolResult
                  }

                  // Record tool call in Langfuse for observability (nested under generation)
                  try {
                    // Calculate duration from tool call start
                    const startTime = toolCallStartTimes.get(toolName)
                    const durationMs = startTime ? Date.now() - startTime : undefined
                    toolCallStartTimes.delete(toolName) // Clean up

                    recordToolCall({
                      traceId,
                      parentObservationId: generationId, // Link to parent generation
                      toolName,
                      args: payload?.args || {},
                      result: parsed,
                      error:
                        parsed?.error ||
                        (parsed?.message?.includes?.('Error') ? parsed.message : undefined),
                      durationMs,
                    })
                  } catch {
                    /* ignore tracing errors */
                  }

                  // Track tool result for Langfuse output
                  const resultSummary =
                    typeof toolResult === 'string'
                      ? toolResult.substring(0, 200)
                      : JSON.stringify(toolResult).substring(0, 200)
                  toolCallSummary.push(`Result (${toolName}): ${resultSummary}...`)

                  // Send tool_result event with PARSED result for client
                  safeEnqueue(
                    `data: ${JSON.stringify({
                      type: 'tool_result',
                      toolName,
                      result: parsed, // Send parsed result so client can access .phase, .success, etc.
                    })}\n\n`
                  )

                  // Continue with action event mapping
                  try {
                    // Safe logging of tool result status
                    if (typeof parsed === 'object' && parsed !== null) {
                      console.log(
                        `[Stream] Parsed tool result success=${parsed.success}, keys:`,
                        Object.keys(parsed)
                      )
                    } else {
                      console.log(
                        `[Stream] Parsed tool result type=${typeof parsed}, value preview:`,
                        typeof parsed === 'string' ? parsed.substring(0, 50) + '...' : parsed
                      )
                    }

                    // Handle ask_character_questions tool - emit as question event
                    if (toolName === 'ask_character_questions' && parsed?.type === 'questions') {
                      console.log('[Stream] Character questions detected, emitting to UI')
                      safeEnqueue(
                        `data: ${JSON.stringify({
                          type: 'questions',
                          questions: parsed.questions.map((q: any) => ({
                            id: q.id,
                            question: q.question,
                            options: q.options,
                            urgency: 'normal',
                            context: `Character: ${parsed.characterName}`,
                          })),
                        })}\n\n`
                      )
                      continue // Don't process as normal action
                    }

                    // Handle ask_continue_to_beats tool - emit as question event
                    if (toolName === 'ask_continue_to_beats' && parsed?.type === 'questions') {
                      console.log('[Stream] Continue to beats question detected')
                      safeEnqueue(
                        `data: ${JSON.stringify({
                          type: 'questions',
                          questions: parsed.questions.map((q: any) => ({
                            id: q.id,
                            question: q.question,
                            options: q.options || [],
                            urgency: 'normal',
                            context: parsed.context,
                          })),
                        })}\n\n`
                      )
                      continue // Don't process as normal action
                    }

                    // Map tool names to action types for UI refresh
                    let actionType: string | null = null
                    let actionPayload: Record<string, unknown> = {}
                    let requiresApproval = false // Section updates need approval

                    // Handle consult_premise_architect (returns episodePremise, not success)
                    if (toolName === 'consult_premise_architect' && parsed?.episodePremise) {
                      actionType = 'UPDATE_EPISODE_PREMISE'
                      actionPayload = {
                        episodeId: episodeId || null,
                        premise: parsed.episodePremise,
                      }
                      requiresApproval = true
                    }
                    // Handle tools that return { success: true, ... }
                    else if (parsed?.success) {
                      // Use configuration-driven action processing for update_world_bible
                      if (toolName === 'update_world_bible') {
                        const fields = parsed.updatedFields || {}
                        console.log(
                          '[Stream] update_world_bible fields:',
                          Object.keys(fields),
                          JSON.stringify(fields).slice(0, 300)
                        )

                        const processedAction = processToolResultToAction(
                          toolName,
                          fields,
                          episodeId
                        )
                        console.log(
                          '[Stream] processedAction:',
                          processedAction
                            ? {
                              actionType: processedAction.actionType,
                              section: processedAction.section,
                              payloadKeys: Object.keys(processedAction.payload),
                            }
                            : 'null'
                        )

                        if (processedAction) {
                          actionType = processedAction.actionType
                          actionPayload = processedAction.payload
                          requiresApproval = processedAction.requiresApproval
                          detectedSection = processedAction.section
                        }
                      }
                      // Handle beat management tool
                      else if (toolName === 'manage_beat' && parsed.beat) {
                        const operation = parsed.message?.toLowerCase() || ''
                        const beatActions: Record<
                          string,
                          { type: ActionType; payload: Record<string, unknown>; approval: boolean }
                        > = {
                          created: {
                            type: ActionType.CREATE_BEAT,
                            payload: parsed.beat,
                            approval: true,
                          },
                          updated: {
                            type: ActionType.UPDATE_BEAT,
                            payload: { beatId: parsed.beat.id, updates: parsed.beat },
                            approval: true,
                          },
                          deleted: {
                            type: ActionType.DELETE_BEAT,
                            payload: { beatId: parsed.deletedId || parsed.beat?.id },
                            approval: false,
                          },
                          approved: {
                            type: ActionType.UPDATE_BEAT,
                            payload: {
                              beatId: parsed.beat?.id,
                              updates: { status: parsed.status },
                            },
                            approval: false,
                          },
                          locked: {
                            type: ActionType.UPDATE_BEAT,
                            payload: {
                              beatId: parsed.beat?.id,
                              updates: { status: parsed.status },
                            },
                            approval: false,
                          },
                        }

                        const matchedAction = Object.entries(beatActions).find(([key]) =>
                          operation.includes(key)
                        )
                        if (matchedAction) {
                          const [, config] = matchedAction
                          actionType = config.type
                          actionPayload = config.payload
                          requiresApproval = config.approval
                          detectedSection = 'beats' // Set section for deduplication
                        }
                      }
                      // Handle phase updates
                      else if (toolName === 'update_story_phase') {
                        actionType = ActionType.UPDATE_STORY_PHASE
                        actionPayload = { phase: parsed.phase }
                        console.log(`[Stream] Phase update detected: ${parsed.phase}`)
                      }
                      // Handle character creation
                      else if (toolName === 'create_character' && parsed.character) {
                        actionType = ActionType.CREATE_CHARACTER
                        actionPayload = parsed.character
                        requiresApproval = false // Character creation is immediate
                        console.log(`[Stream] Character created: ${parsed.character.name}`)
                      }
                      // Handle episode creation
                      else if (toolName === 'create_episode' && parsed.episode) {
                        // Emit as info notification, not approval action
                        safeEnqueue(
                          `data: ${JSON.stringify({
                            type: 'info',
                            message: parsed.message || `Episode created: ${parsed.episode.title}`,
                            data: parsed.episode,
                          })}\n\n`
                        )
                        console.log(`[Stream] Episode created: ${parsed.episode.title}`)

                        // If nextStep suggests asking about beats, the agent will call ask_continue_to_beats next
                        continue // Don't create an action
                      }
                      // Handle start_beat_planning
                      else if (toolName === 'start_beat_planning' && parsed.type === 'navigation') {
                        safeEnqueue(
                          `data: ${JSON.stringify({
                            type: 'navigation',
                            action: parsed.action,
                            episodeId: parsed.episodeId,
                          })}\n\n`
                        )
                        console.log(`[Stream] Navigation signal: ${parsed.action}`)
                        continue // Don't create an action
                      }
                    }

                    // FALLBACK: If we detected a section update but no action was mapped,
                    // create a generic action based on the section
                    if (!actionType && isSectionUpdate && toolName === 'update_world_bible') {
                      actionType = getActionTypeForSection(detectedSection)
                      actionPayload = parsed?.updatedFields || parsed || {}
                      requiresApproval = true
                      console.log(
                        `[Stream] Using fallback action type: ${actionType} for section ${detectedSection}`
                      )
                    }

                    // Collect action to emit AFTER final message (better UX)
                    if (actionType) {
                      // Generate deduplication key to prevent emitting same action multiple times
                      const dedupeKey = getActionDedupeKey(toolName, detectedSection, actionPayload)

                      if (emittedActionKeys.has(dedupeKey)) {
                        console.log(
                          `[Stream] Skipping duplicate action: ${actionType} for section ${detectedSection}`
                        )
                      } else {
                        // Mark this action as emitted
                        emittedActionKeys.add(dedupeKey)

                        // Auto-link entities in action payload fields before storing
                        let linkedPayload = { ...actionPayload }
                        if (projectId) {
                          try {
                            const { entityAutoLinker } =
                              await import('@/domains/storyteller/services/entity-auto-linker')

                            // Auto-link text fields in the payload
                            for (const [key, value] of Object.entries(linkedPayload)) {
                              if (typeof value === 'string' && value.length > 10) {
                                linkedPayload[key] = await entityAutoLinker.autoLink(
                                  value,
                                  projectId
                                )
                              } else if (Array.isArray(value)) {
                                // Handle arrays (e.g., plotTwists)
                                linkedPayload[key] = await Promise.all(
                                  value.map(async (item: any) => {
                                    if (typeof item === 'string') {
                                      return await entityAutoLinker.autoLink(item, projectId)
                                    } else if (item && typeof item === 'object') {
                                      // Handle objects with text fields
                                      const linkedItem = { ...item }
                                      for (const [field, fieldValue] of Object.entries(
                                        linkedItem
                                      )) {
                                        if (
                                          typeof fieldValue === 'string' &&
                                          fieldValue.length > 10
                                        ) {
                                          linkedItem[field] = await entityAutoLinker.autoLink(
                                            fieldValue,
                                            projectId
                                          )
                                        }
                                      }
                                      return linkedItem
                                    }
                                    return item
                                  })
                                )
                              }
                            }
                          } catch (err) {
                            console.warn('[Stream] Entity auto-linking in payload failed:', err)
                            // Continue with original payload
                          }
                        }

                        // Collect action to emit after final message
                        const actionWithBefore = {
                          type: actionType,
                          payload: {
                            ...linkedPayload,
                            _before: existingBibleData[detectedSection] || null, // For diff viewer
                          },
                          status: requiresApproval ? 'pending' : 'committed',
                          confidence: parsed?.confidence || 1.0,
                          reasoning: parsed?.message || `Tool ${toolName} completed successfully`,
                        }

                        pendingActions.push(actionWithBefore)
                        console.log(
                          `[Stream] Collected action for later emission: ${actionType} (approval=${requiresApproval})`
                        )

                        // End section loading when we have a detected section
                        if (detectedSection !== 'full' && toolName === 'update_world_bible') {
                          safeEnqueue(
                            `data: ${JSON.stringify({
                              type: 'section_loading',
                              section: detectedSection,
                              loading: false,
                            })}\n\n`
                          )
                        }
                      }
                    }
                  } catch {
                    // Tool result wasn't JSON or parsing failed - that's ok
                  }
                } else if (type === 'step-start') {
                  // High fidelity activity tracking
                  safeEnqueue(
                    `data: ${JSON.stringify({
                      type: 'agent_status',
                      agent: 'Storyteller',
                      status: 'thinking',
                      message: `Step: ${payload?.stepName || 'Processing'}`,
                      details: Array.isArray(payload?.tools) ? payload.tools.join(', ') : undefined,
                    })}\n\n`
                  )
                }
              } catch (chunkError) {
                // Log but don't crash on individual chunk errors
                console.warn('Stream chunk error:', chunkError)
              }
            }
          } catch (streamIterationError: unknown) {
            // The fullStream iterator threw - extract error details and send to client
            console.error('Stream iteration error:', streamIterationError)

            // Extract user-friendly error message
            let errorMessage = 'An error occurred while processing your request.'
            let errorCode = 'STREAM_ERROR'

            if (streamIterationError?.error?.code === 'insufficient_quota') {
              errorMessage =
                '⚠️ OpenAI API quota exceeded. Please check your billing details or try again later.'
              errorCode = 'QUOTA_EXCEEDED'
            } else if (streamIterationError?.error?.message) {
              errorMessage = streamIterationError.error.message
              errorCode = streamIterationError.error.code || 'API_ERROR'
            } else if (streamIterationError?.message) {
              errorMessage = getErrorMessage(streamIterationError)
            }

            // Send error event to client
            safeEnqueue(
              `data: ${JSON.stringify({
                type: 'error',
                error: {
                  message: errorMessage,
                  code: errorCode,
                  details:
                    process.env.NODE_ENV === 'development'
                      ? String(streamIterationError)
                      : undefined,
                },
              })}\n\n`
            )

            // Also send as a message so it's visible in chat
            safeEnqueue(
              `data: ${JSON.stringify({
                type: 'message',
                message: {
                  sender: 'System',
                  content: `❌ **Error:** ${errorMessage}`,
                  type: 'error',
                },
              })}\n\n`
            )

            safeEnqueue(`data: ${JSON.stringify({ type: 'complete' })}\n\n`)
            safeClose()
            return
          }

          // Auto-link entity names in generated text before sending
          let finalText = fullText
          if (projectId && fullText.length > 0) {
            try {
              const { entityAutoLinker } =
                await import('@/domains/storyteller/services/entity-auto-linker')
              finalText = await entityAutoLinker.autoLink(fullText, projectId)
            } catch (err) {
              console.warn('[Stream] Entity auto-linking failed:', err)
              // Continue with original text
            }
          }

          // Send final message with auto-linked entities
          safeEnqueue(
            `data: ${JSON.stringify({
              type: 'message',
              message: {
                sender: 'Storyteller',
                content: finalText,
                type: 'ai',
              },
            })}\n\n`
          )

          // NOW emit any collected actions (appears after final message for better UX)
          for (const action of pendingActions) {
            safeEnqueue(
              `data: ${JSON.stringify({
                type: 'action',
                action,
              })}\n\n`
            )
            console.log(`[Stream] Emitted action at end: ${action.type}`)
          }

          // Send complete event
          safeEnqueue(`data: ${JSON.stringify({ type: 'complete' })}\n\n`)

          // End Langfuse generation and trace (safe - won't throw)
          try {
            // Build comprehensive output including text and tool calls - ensure no undefined values
            // Use finalText (with auto-linked entities) for accurate tracing
            const langfuseOutput = {
              text: finalText || '(no text output)',
              toolCalls: toolCallSummary.length > 0 ? toolCallSummary : ['(no tool calls)'],
              summary: finalText
                ? finalText.slice(0, 500)
                : toolCallSummary.length > 0
                  ? toolCallSummary.slice(0, 3).join(' | ')
                  : '(empty response)',
              entitiesLinked: finalText !== fullText, // Track if auto-linking was applied
            }
            generation?.end({ output: langfuseOutput })
            trace?.update({
              output: langfuseOutput,
              input: promptWithContext || '(no input)', // Ensure trace input is also set
            })
            langfuseClient?.flush().catch(() => { })
          } catch {
            /* ignore langfuse errors */
          }

          safeClose()
        } catch (error) {
          console.error('Stream processing error:', error)

          // Log error to Langfuse (safe - won't throw)
          try {
            generation?.end({
              output: error instanceof Error ? error.message : 'Stream failed',
              level: 'ERROR',
              statusMessage: error instanceof Error ? error.message : 'Unknown error',
            })
            langfuseClient?.flush().catch(() => { })
          } catch {
            /* ignore */
          }

          safeEnqueue(
            `data: ${JSON.stringify({
              type: 'error',
              message: error instanceof Error ? error.message : 'Stream failed',
            })}\n\n`
          )
          safeClose()
        } finally {
          // Cleanup listeners
          eventBus.off(WORKFLOW_EVENTS.STEP_START, onStepStart)
          eventBus.off(WORKFLOW_EVENTS.STEP_COMPLETE, onStepComplete)
          eventBus.off(WORKFLOW_EVENTS.AGENT_THOUGHT, onAgentThought)
          eventBus.off(WORKFLOW_EVENTS.QUESTION_ASKED, onQuestionAsked)
          eventBus.off(WORKFLOW_EVENTS.WORKFLOW_SUSPENDED, onWorkflowSuspended)
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'x-trace-id': traceId,
      },
    })
  } catch (error) {
    console.error('Streaming error:', error)

    // Record error with categorization
    const errorTraceId = `error-${Date.now()}`
    try {
      recordError(errorTraceId, error instanceof Error ? error : new Error(String(error)), {
        category: 'SYSTEM',
        agentName: 'Storyteller',
        recoverable: false,
      })
      await flushObservability()
    } catch {
      /* ignore */
    }

    return new Response(JSON.stringify({ error: 'Streaming failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
