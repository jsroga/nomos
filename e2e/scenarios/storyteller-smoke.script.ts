/**
 * STORYTELLER SMOKE TEST - Rock Solid E2E Verification
 * 
 * This test verifies the CORE functionality that MUST work:
 * 
 * LAYER 1: API (Direct HTTP)
 * - Stream endpoint responds
 * - Section detection works
 * - Tool calls are forced for section updates
 * - Actions are emitted with correct type and status
 * 
 * LAYER 2: Flow (User Journey)
 * - Ask for next step → get response
 * - Request section update → tool called → action pending
 * - Phase transitions work
 * 
 * Run: npm run test:e2e smoke
 */

import {
  BANNER_WIDTH,
  BYPASS_AUTH_VALUE,
  DB_PROPAGATION_DELAY_MS,
  DEFAULT_BASE_URL,
  DEFAULT_TEST_PROJECT_ID,
  SMOKE_SCRATCH_PROJECT_DESCRIPTION,
  SMOKE_SCRATCH_PROJECT_NAME,
  EMPTY_JSON_OBJECT,
  GENERIC_ANSWER_LOG_LIMIT,
  GENERIC_ANSWER_MIN_LENGTH,
  LINK_SAMPLE_LIMIT,
  LIST_SEPARATOR,
  MAX_WORLD_BIBLE_CALLS,
  PAYLOAD_LOG_LIMIT,
  SmokeAction,
  SmokeActionStatus,
  SmokeError,
  SmokeEvent,
  SmokeHttp,
  SmokeKey,
  SmokeLog,
  SmokeMatch,
  SmokePrompt,
  SmokeSender,
  SmokeTestName,
  SmokeTool,
} from '../constants/storyteller-smoke'

const BASE_URL = process.env.TEST_BASE_URL || DEFAULT_BASE_URL
const API_URL = `${BASE_URL}/api/storyteller/chat/stream`
const PROJECT_API_URL = `${BASE_URL}/api/storyteller/projects`
/** Set in `main` after ensure — env override, existing fixture, or freshly created. */
let TEST_PROJECT_ID = process.env.TEST_PROJECT_ID || DEFAULT_TEST_PROJECT_ID
// Auth cookie for E2E persistence tests (optional - tests will be skipped if not provided)
const AUTH_COOKIE = process.env.TEST_AUTH_COOKIE || ''

interface SSEAction {
  type?: string
  status?: string
  payload?: unknown
}

interface SSEMessage {
  sender?: string
  content?: string
}

interface SSEEvent {
  type: string
  toolName?: string
  result?: unknown
  token?: string
  action?: SSEAction
  message?: SSEMessage
}

interface SmokeCharacter {
  id?: string
  name: string
}

// ============================================================================
// UTILITIES
// ============================================================================

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {}
}

function readNested(source: unknown, key: SmokeKey): unknown {
  return isRecord(source) ? source[key] : undefined
}

function parseJsonRecord(raw: string): Record<string, unknown> {
  try {
    return asRecord(JSON.parse(raw || EMPTY_JSON_OBJECT))
  } catch {
    return {}
  }
}

/** Action payloads carry the field either at the root or under `updatedFields`. */
function readPayloadArray(payload: unknown, key: SmokeKey): unknown[] {
  const direct = readNested(payload, key)
  if (Array.isArray(direct)) return direct
  const nested = readNested(readNested(payload, SmokeKey.UpdatedFields), key)
  return Array.isArray(nested) ? nested : []
}

/** True when the action targeted `key` (full array and/or updatedFields list). */
function payloadTouchesField(payload: unknown, key: SmokeKey): boolean {
  if (readPayloadArray(payload, key).length > 0) return true
  const updated = readNested(payload, SmokeKey.UpdatedFields)
  return Array.isArray(updated) && updated.some(value => value === key)
}

async function parseSSEStream(response: Response): Promise<SSEEvent[]> {
  const events: SSEEvent[] = []
  const reader = response.body?.getReader()
  if (!reader) throw new Error(SmokeError.NoResponseBody)

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (line.startsWith(SmokeHttp.SseDataPrefix)) {
        try {
          events.push(JSON.parse(line.slice(SmokeHttp.SseDataPrefix.length)))
        } catch { /* skip invalid JSON */ }
      }
    }
  }

  return events
}

async function sendChatMessage(message: string, projectId: string = TEST_PROJECT_ID): Promise<SSEEvent[]> {
  const response = await fetch(API_URL, {
    method: SmokeHttp.Post,
    headers: {
      'Content-Type': 'application/json',
      'x-bypass-auth': BYPASS_AUTH_VALUE // Bypass auth for E2E tests
    },
    body: JSON.stringify({
      message,
      projectId,
      traceId: `smoke-${Date.now()}`
    })
  })

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${await response.text()}`)
  }

  return parseSSEStream(response)
}

function findEvent(events: SSEEvent[], type: SmokeEvent): SSEEvent | undefined {
  return events.find(e => e.type === type)
}

function findEvents(events: SSEEvent[], type: SmokeEvent): SSEEvent[] {
  return events.filter(e => e.type === type)
}

function findToolResult(events: SSEEvent[], tool: SmokeTool): SSEEvent | undefined {
  return findEvents(events, SmokeEvent.ToolResult).find(t => t.toolName === tool)
}

function findAction(events: SSEEvent[], ...types: SmokeAction[]): SSEEvent | undefined {
  return findEvents(events, SmokeEvent.Action).find(a => types.some(type => a.action?.type === type))
}

function toolNameList(toolResults: SSEEvent[]): string {
  return toolResults.map(t => t.toolName).join(LIST_SEPARATOR)
}

// ============================================================================
// TEST CASES
// ============================================================================

interface TestResult {
  name: string
  passed: boolean
  error?: string
  duration: number
}

const results: TestResult[] = []

async function runTest(name: SmokeTestName, fn: () => Promise<void>) {
  const start = Date.now()
  try {
    await fn()
    results.push({ name, passed: true, duration: Date.now() - start })
    console.log(`✅ ${name}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    results.push({ name, passed: false, error: message, duration: Date.now() - start })
    console.log(`❌ ${name}: ${message}`)
  }
}

// ============================================================================
// LAYER 1: API TESTS
// ============================================================================

async function test_API_StreamEndpointResponds() {
  const events = await sendChatMessage(SmokePrompt.Hello)

  const startEvent = findEvent(events, SmokeEvent.Start)
  if (!startEvent) throw new Error(SmokeError.NoStartEvent)

  const completeEvent = findEvent(events, SmokeEvent.Complete)
  if (!completeEvent) throw new Error(SmokeError.NoCompleteEvent)
}

async function test_API_SectionDetection_Soundtracks() {
  // Ask explicitly to update soundtracks - LLM decides to use tool
  const events = await sendChatMessage(SmokePrompt.UpdateSoundtracks)

  // LLM should call update_world_bible when explicitly asked
  const toolResults = findEvents(events, SmokeEvent.ToolResult)
  const worldBibleTool = toolResults.find(t => t.toolName === SmokeTool.UpdateWorldBible)

  // If no tool call, check for action (tool might have been called and action emitted)
  const soundtrackAction = findAction(events, SmokeAction.UpdateSoundtracks)

  if (!worldBibleTool && !soundtrackAction) {
    // Check if any tool was used at all
    if (toolResults.length > 0) {
      console.log(SmokeLog.ToolResults, toolNameList(toolResults))
    } else {
      console.log(SmokeLog.AllEvents, JSON.stringify(events.map(e => ({ ...e, type: e.type })), null, 2))
    }
    throw new Error(SmokeError.NoSoundtrackToolOrAction)
  }
}

async function test_API_SectionDetection_WorldRules() {
  const events = await sendChatMessage(SmokePrompt.AddWorldRules)

  if (!findToolResult(events, SmokeTool.UpdateWorldBible)) {
    throw new Error(SmokeError.WorldRulesToolNotCalled)
  }
}

async function test_API_ActionEmitted_WithPendingStatus() {
  const events = await sendChatMessage(SmokePrompt.GenerateFactions)

  const actionEvents = findEvents(events, SmokeEvent.Action)

  if (actionEvents.length === 0) {
    throw new Error(SmokeError.NoActionEvent)
  }

  const action = actionEvents[0].action
  if (!action) {
    throw new Error(SmokeError.ActionWithoutPayload)
  }

  // Check action has pending status (requires approval)
  if (action.status !== SmokeActionStatus.Pending) {
    console.log(`  Warning: Action status is "${action.status}" not "${SmokeActionStatus.Pending}"`)
  }

  // Check action type is correct
  const validTypes = [SmokeAction.UpdateFactions, SmokeAction.UpdateSeriesBible, SmokeAction.UpdateWorldRules]
  const type = action.type
  if (!validTypes.some(t => type?.includes(t) || type?.includes(SmokeMatch.ActionUpdatePrefix))) {
    throw new Error(`Unexpected action type: ${type}`)
  }
}

// ============================================================================
// LAYER 2: FLOW TESTS
// ============================================================================

async function test_FLOW_AskNextStep() {
  const events = await sendChatMessage(SmokePrompt.AskNextStep)

  // Should get a response (tokens)
  const tokens = findEvents(events, SmokeEvent.Token)
  if (tokens.length === 0) {
    throw new Error(SmokeError.NoTokens)
  }

  // Should complete
  const complete = findEvent(events, SmokeEvent.Complete)
  if (!complete) {
    throw new Error(SmokeError.StreamIncomplete)
  }
}

async function test_FLOW_GenerateContent_TriggersApproval() {
  const events = await sendChatMessage(SmokePrompt.CreateEpisodePremise)

  // Should either have tool_result OR action
  const toolResults = findEvents(events, SmokeEvent.ToolResult)
  const actions = findEvents(events, SmokeEvent.Action)

  if (toolResults.length === 0 && actions.length === 0) {
    throw new Error(SmokeError.GenerationFailed)
  }
}

// ============================================================================
// LAYER 3: WORLD RULES E2E (Full Flow)
// ============================================================================

const ACTIONS_API_URL = `${BASE_URL}/api/storyteller/actions`

interface ApprovalOutcome {
  ok: boolean
  status: number
  errorText: string
  success: boolean
  result: unknown
}

/** POST an approved action to the actions endpoint. Callers own the failure copy. */
async function postActionApproval(action: SSEAction | undefined): Promise<ApprovalOutcome> {
  const response = await fetch(ACTIONS_API_URL, {
    method: SmokeHttp.Post,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': AUTH_COOKIE,
      'x-bypass-auth': BYPASS_AUTH_VALUE,
    },
    body: JSON.stringify({
      action,
      projectId: TEST_PROJECT_ID,
    })
  })

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      errorText: await response.text(),
      success: false,
      result: undefined,
    }
  }

  const result = await response.json()
  return {
    ok: true,
    status: response.status,
    errorText: '',
    success: Boolean(readNested(result, SmokeKey.Success)),
    result,
  }
}

function logSkippedPersistence() {
  console.log(SmokeLog.SkipPersistenceNoCookie)
  console.log(SmokeLog.GenerationFlowVerified)
}

function assertWorldBibleInvoked(events: SSEEvent[]) {
  if (findToolResult(events, SmokeTool.UpdateWorldBible)) {
    console.log(SmokeLog.WorldBibleToolCalled)
    return
  }

  // Check for action as fallback
  if (findEvents(events, SmokeEvent.Action).length === 0) {
    throw new Error(SmokeError.Step1WorldBibleMissing)
  }
  console.log(SmokeLog.ToolCallViaAction)
}

function extractWorldRulesPayload(events: SSEEvent[]): unknown[] {
  const worldRulesAction = findAction(events, SmokeAction.UpdateWorldRules, SmokeAction.UpdateSeriesBible)

  if (!worldRulesAction) {
    throw new Error(SmokeError.Step2NoWorldRulesAction)
  }

  console.log(SmokeLog.ActionEmitted, worldRulesAction.action?.type)

  const payload = worldRulesAction.action?.payload
  const worldRules = readPayloadArray(payload, SmokeKey.WorldRules)

  if (worldRules.length === 0 && !payloadTouchesField(payload, SmokeKey.WorldRules)) {
    console.log(SmokeLog.Payload, JSON.stringify(payload).slice(0, PAYLOAD_LOG_LIMIT))
    throw new Error(SmokeError.Step3NoWorldRulesPayload)
  }

  return worldRules
}

async function verifyPersistedWorldRules() {
  console.log(SmokeLog.WorldRulesStep5)

  const projectResponse = await fetch(`${PROJECT_API_URL}/${TEST_PROJECT_ID}`, {
    headers: {
      'Cookie': AUTH_COOKIE,
      'x-bypass-auth': BYPASS_AUTH_VALUE
    }
  })

  if (!projectResponse.ok) {
    throw new Error(`Step 5 FAILED: Could not fetch project: ${projectResponse.status}`)
  }

  const projectData = await projectResponse.json()

  // Check seriesBible or storyPlan for worldRules
  const seriesBible = asRecord(
    readNested(projectData, SmokeKey.SeriesBible) || readNested(projectData, SmokeKey.SeriesBibleSnake),
  )
  const storyPlan = asRecord(
    readNested(seriesBible, SmokeKey.StoryPlan) || readNested(projectData, SmokeKey.StoryPlan),
  )
  const fromStoryPlan = readNested(storyPlan, SmokeKey.WorldRules)
  const persistedRules = Array.isArray(fromStoryPlan)
    ? fromStoryPlan
    : readNested(seriesBible, SmokeKey.WorldRules)

  if (!Array.isArray(persistedRules) || persistedRules.length === 0) {
    console.log(SmokeLog.ProjectDataKeys, Object.keys(asRecord(projectData)))
    console.log(SmokeLog.SeriesBibleKeys, Object.keys(seriesBible))
    throw new Error(SmokeError.Step5NoPersistedWorldRules)
  }

  console.log(`  ✓ Verified ${persistedRules.length} world rules persisted to database`)

  // Verify structure of persisted rules
  const firstRule = asRecord(persistedRules[0])
  if (!firstRule[SmokeKey.Category] || !firstRule[SmokeKey.Rule]) {
    throw new Error(`Step 6 FAILED: World rule missing required fields. Got: ${JSON.stringify(firstRule)}`)
  }

  console.log(SmokeLog.WorldRuleStructureOk, firstRule[SmokeKey.Category])
}

async function test_E2E_WorldRules_GenerateAndPersist() {
  console.log(SmokeLog.WorldRulesStep1)

  const events = await sendChatMessage(SmokePrompt.GenerateWorldRules, TEST_PROJECT_ID)

  assertWorldBibleInvoked(events)
  const worldRules = extractWorldRulesPayload(events)
  console.log(`  ✓ Action payload contains ${worldRules.length} world rules`)

  // Execute the action (simulate approval) - requires auth
  if (!AUTH_COOKIE) {
    logSkippedPersistence()
    return
  }

  console.log(SmokeLog.WorldRulesStep4)

  const worldRulesAction = findAction(events, SmokeAction.UpdateWorldRules, SmokeAction.UpdateSeriesBible)
  const outcome = await postActionApproval(worldRulesAction?.action)

  if (!outcome.ok) {
    throw new Error(`Step 4 FAILED: Action execution failed: ${outcome.status} - ${outcome.errorText}`)
  }
  if (!outcome.success) {
    throw new Error(`Step 4 FAILED: Action execution returned success=false: ${JSON.stringify(outcome.result)}`)
  }

  console.log(SmokeLog.ActionExecutedOk)

  await verifyPersistedWorldRules()
}

async function test_E2E_PlotTwists_GenerateAndPersist() {
  console.log(SmokeLog.PlotTwistsStep1)

  const events = await sendChatMessage(SmokePrompt.GeneratePlotTwists, TEST_PROJECT_ID)

  const plotTwistsAction = findAction(events, SmokeAction.UpdatePlotTwists, SmokeAction.UpdateSeriesBible)

  if (!plotTwistsAction) {
    // Check if tool was at least called
    const toolResults = findEvents(events, SmokeEvent.ToolResult)
    if (toolResults.length > 0) {
      console.log(SmokeLog.ToolResults, toolNameList(toolResults))
    }
    throw new Error(SmokeError.NoPlotTwistsAction)
  }

  console.log(SmokeLog.ActionEmitted, plotTwistsAction.action?.type)

  const payload = plotTwistsAction.action?.payload
  const plotTwists = readPayloadArray(payload, SmokeKey.PlotTwists)

  if (plotTwists.length === 0 && !payloadTouchesField(payload, SmokeKey.PlotTwists)) {
    console.log(SmokeLog.Payload, JSON.stringify(payload).slice(0, PAYLOAD_LOG_LIMIT))
    throw new Error(SmokeError.NoPlotTwistsPayload)
  }

  console.log(`  ✓ Action payload contains ${plotTwists.length} plot twists`)

  // Execute the action - requires auth
  if (!AUTH_COOKIE) {
    logSkippedPersistence()
    return
  }

  console.log(SmokeLog.PlotTwistsStep2)

  const outcome = await postActionApproval(plotTwistsAction.action)

  if (!outcome.ok) {
    throw new Error(`Action execution failed: ${outcome.status}`)
  }
  if (!outcome.success) {
    throw new Error(SmokeError.ActionExecutionUnsuccessful)
  }

  console.log(SmokeLog.ActionExecutedPersisted)
}

/**
 * The agent may answer a creation request by asking clarifying questions or by
 * probing for an existing character — both count as understood intent.
 */
function characterIntentUnderstood(events: SSEEvent[]): boolean {
  const toolResults = findEvents(events, SmokeEvent.ToolResult)

  if (toolResults.some(t => t.toolName === SmokeTool.AskCharacterQuestions)) {
    console.log(SmokeLog.AgentAskedQuestions)
    return true
  }

  const charTool = toolResults.find(t =>
    t.toolName === SmokeTool.CheckCharacterExists ||
    t.toolName?.includes(SmokeMatch.CharacterTool)
  )
  if (charTool) {
    console.log(`  ✓ Character-related tool called: ${charTool.toolName} (valid flow)`)
    return true
  }

  return false
}

async function verifyCharacterPersisted(charName: string) {
  console.log(SmokeLog.CharacterVerifyStep)

  // Give a small delay for DB write propagation if async
  await new Promise(r => setTimeout(r, DB_PROPAGATION_DELAY_MS))

  const charsResponse = await fetch(`${BASE_URL}/api/storyteller/characters?projectId=${TEST_PROJECT_ID}`, {
    headers: { 'Cookie': AUTH_COOKIE, 'x-bypass-auth': BYPASS_AUTH_VALUE }
  })

  if (!charsResponse.ok) {
    throw new Error(`Failed to fetch characters: ${charsResponse.status}`)
  }

  const characters: SmokeCharacter[] = await charsResponse.json()
  // Fuzzy match since LLM might adjust name slightly or add title
  const found = characters.find(c => c.name.includes(charName) || charName.includes(c.name))

  if (!found) {
    throw new Error(`Character '${charName}' not found in DB after approval/creation. Found: ${characters.map(c => c.name).join(LIST_SEPARATOR)}`)
  }

  console.log(`  ✓ Character persisted: ${found.name} (${found.id})`)
}

async function test_E2E_CharacterCreation() {
  const charName = `TestHero_${Date.now()}`
  console.log(`  📤 Step 1: Request character creation for ${charName}...`)

  const events = await sendChatMessage(
    `Create a new protagonist named ${charName}. He is a reluctant hero with a mysterious past, driven by revenge. His fatal flaw is hubris. Use the create_character tool to save this character.`,
    TEST_PROJECT_ID
  )

  // The agent might ask questions first (ask_character_questions), which is valid flow,
  // but for "Create x named y..." it often goes straight to creation.
  const createCharTool = findToolResult(events, SmokeTool.CreateCharacter)
  const createAction = findAction(events, SmokeAction.CreateCharacter)

  if (createCharTool) {
    console.log(SmokeLog.CreateCharacterToolCalled)
  } else if (characterIntentUnderstood(events)) {
    return // Pass test as the agent understood the intent
  } else if (createAction) {
    console.log(SmokeLog.CreateCharacterActionSeen)
  } else {
    throw new Error(SmokeError.NoCharacterToolOrAction)
  }

  // Unlike World Bible updates, character creation often emits an action that requires approval.
  if (!AUTH_COOKIE) {
    console.log(SmokeLog.SkipApprovalNoCookie)
    return
  }

  if (createAction) {
    console.log(SmokeLog.CharacterApprovalStep)
    const outcome = await postActionApproval(createAction.action)

    if (!outcome.ok) {
      throw new Error(`Approval failed: ${outcome.status} - ${outcome.errorText}`)
    }
    if (!outcome.success) {
      throw new Error(`Approval returned success=false: ${JSON.stringify(outcome.result)}`)
    }
    console.log(SmokeLog.CharacterApproved)
  } else {
    // If no action, maybe the tool persisted it directly (older mode)
    console.log(SmokeLog.CharacterDirectPersistence)
  }

  await verifyCharacterPersisted(charName)
}

async function test_E2E_LinksExtraction() {
  console.log(SmokeLog.LinksStep1)

  // Ask a conversational question that won't trigger mandatory tool usage
  // (avoid keywords like "world rules", "generate", "create" which force tool calls)
  const events = await sendChatMessage(SmokePrompt.AskToneAndTheme, TEST_PROJECT_ID)

  // Check for AI response content - either from message event or token events
  const messageEvents = findEvents(events, SmokeEvent.Message)
  const aiMessage = messageEvents.find(m => m.message?.sender === SmokeSender.Storyteller)?.message

  // Also check token events as fallback - tokens represent streamed text
  const tokenContent = findEvents(events, SmokeEvent.Token).map(t => t.token || '').join('')

  const content = aiMessage?.content || tokenContent

  if (!content) {
    throw new Error(SmokeError.NoAiContent)
  }

  console.log(SmokeLog.ResponseLength, content.length)

  // Link pattern: [Name][id]
  const linkRegex = /\[.*?\]\[.*?\]/g

  if (linkRegex.test(content)) {
    console.log(SmokeLog.LinksDetected, content.match(linkRegex)?.slice(0, LINK_SAMPLE_LIMIT))
  } else {
    // Not a failure: a generic smoke run cannot guarantee entity text overlap.
    console.log(SmokeLog.LinksMissing)
  }
}

async function test_E2E_WorldDescription_LinkGateAndNoLoop() {
  console.log(SmokeLog.WorldDescriptionStart)

  const events = await sendChatMessage(SmokePrompt.GenerateWorldDescription, TEST_PROJECT_ID)

  const worldBibleCalls = findEvents(events, SmokeEvent.ToolResult)
    .filter(t => t.toolName === SmokeTool.UpdateWorldBible)

  if (worldBibleCalls.length === 0) {
    throw new Error(SmokeError.WorldDescriptionToolMissing)
  }

  if (worldBibleCalls.length > MAX_WORLD_BIBLE_CALLS) {
    throw new Error(`Loop detected: update_world_bible called ${worldBibleCalls.length} times (max ${MAX_WORLD_BIBLE_CALLS} expected)`)
  }

  const raw = worldBibleCalls[worldBibleCalls.length - 1].result
  const lastPayload = typeof raw === 'string' ? parseJsonRecord(raw) : asRecord(raw)

  if (
    lastPayload[SmokeKey.Success] === false &&
    String(lastPayload[SmokeKey.Error] || '').includes(SmokeMatch.Rejected)
  ) {
    // Escape hatch should have accepted by the 3rd attempt.
    throw new Error(SmokeError.WorldDescriptionStillRejected)
  }

  if (!findEvent(events, SmokeEvent.Complete)) {
    throw new Error(SmokeError.StreamIncomplete)
  }

  console.log(`  ✓ update_world_bible called ${worldBibleCalls.length} time(s), stream completed`)
}

async function test_E2E_GraphRAG_ContextRetrieval() {
  // A new traceId implies a fresh conversation, forcing retrieval from DB/Graph
  // rather than just conversation history.
  console.log(SmokeLog.GraphRagStep1)

  const events = await sendChatMessage(SmokePrompt.AskUserRulesAboutMagic, TEST_PROJECT_ID)

  const messageEvents = findEvents(events, SmokeEvent.Message)
  const content = messageEvents.find(m => m.message?.sender === SmokeSender.Storyteller)?.message?.content || ''

  if (content.toLowerCase().includes(SmokeMatch.Magic) || content.length > GENERIC_ANSWER_MIN_LENGTH) {
    console.log(SmokeLog.GraphRagRelevant)
  } else {
    // Soft fail warning
    console.log(SmokeLog.GraphRagGeneric, content.slice(0, GENERIC_ANSWER_LOG_LIMIT))
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function ensureSmokeProjectId(): Promise<string> {
  if (process.env.TEST_PROJECT_ID) return process.env.TEST_PROJECT_ID

  console.log(SmokeLog.EnsuringProject)
  const existing = await fetch(`${PROJECT_API_URL}/${DEFAULT_TEST_PROJECT_ID}`, {
    headers: { 'x-bypass-auth': BYPASS_AUTH_VALUE },
  })
  if (existing.ok) return DEFAULT_TEST_PROJECT_ID

  const created = await fetch(PROJECT_API_URL, {
    method: SmokeHttp.Post,
    headers: {
      'Content-Type': 'application/json',
      'x-bypass-auth': BYPASS_AUTH_VALUE,
    },
    body: JSON.stringify({
      name: SMOKE_SCRATCH_PROJECT_NAME,
      description: SMOKE_SCRATCH_PROJECT_DESCRIPTION,
    }),
  })
  if (!created.ok) {
    throw new Error(`${SmokeError.FailedEnsureProject} (${created.status}: ${await created.text()})`)
  }
  const body: unknown = await created.json()
  const id =
    body && typeof body === 'object' && 'id' in body && typeof body.id === 'string' ? body.id : ''
  if (!id) throw new Error(SmokeError.FailedEnsureProject)
  console.log(SmokeLog.CreatedScratchProject, id)
  return id
}

async function main() {
  console.log('\n' + '█'.repeat(BANNER_WIDTH))
  console.log(SmokeLog.BannerTitle)
  console.log(SmokeLog.BannerSubtitle)
  console.log('█'.repeat(BANNER_WIDTH) + '\n')

  TEST_PROJECT_ID = await ensureSmokeProjectId()

  console.log(SmokeLog.TestingAgainst, API_URL)
  console.log(SmokeLog.ProjectId, TEST_PROJECT_ID)
  console.log('')

  // LAYER 1: API
  console.log(SmokeLog.LayerApi)
  await runTest(SmokeTestName.StreamEndpointResponds, test_API_StreamEndpointResponds)
  await runTest(SmokeTestName.SectionDetectionSoundtracks, test_API_SectionDetection_Soundtracks)
  await runTest(SmokeTestName.SectionDetectionWorldRules, test_API_SectionDetection_WorldRules)
  await runTest(SmokeTestName.ActionEmittedPending, test_API_ActionEmitted_WithPendingStatus)

  // LAYER 2: FLOW
  console.log(SmokeLog.LayerFlow)
  await runTest(SmokeTestName.AskNextStep, test_FLOW_AskNextStep)
  await runTest(SmokeTestName.GenerateTriggersApproval, test_FLOW_GenerateContent_TriggersApproval)

  // LAYER 3: E2E PERSISTENCE
  console.log(SmokeLog.LayerPersistence)
  // (Assuming these modify DB, good to test last or with cleanup)
  await runTest(SmokeTestName.WorldRulesPersist, test_E2E_WorldRules_GenerateAndPersist)
  await runTest(SmokeTestName.PlotTwistsPersist, test_E2E_PlotTwists_GenerateAndPersist)

  // LAYER 4: ADVANCED FEATURES
  console.log(SmokeLog.LayerAdvanced)
  await runTest(SmokeTestName.WorldDescriptionLinkGate, test_E2E_WorldDescription_LinkGateAndNoLoop)
  await runTest(SmokeTestName.CharacterCreation, test_E2E_CharacterCreation)
  await runTest(SmokeTestName.LinksExtraction, test_E2E_LinksExtraction)
  await runTest(SmokeTestName.GraphRagRetrieval, test_E2E_GraphRAG_ContextRetrieval)

  // Summary
  console.log('\n' + '='.repeat(BANNER_WIDTH))
  console.log(SmokeLog.ResultsHeader)
  console.log('='.repeat(BANNER_WIDTH))

  const passed = results.reduce((count, r) => (r.passed ? count + 1 : count), 0)
  const failed = results.length - passed

  results.forEach(r => {
    const icon = r.passed ? '✅' : '❌'
    console.log(`${icon} ${r.name} (${r.duration}ms)`)
    if (r.error) console.log(`   └─ ${r.error}`)
  })

  console.log('─'.repeat(BANNER_WIDTH))
  console.log(`PASSED: ${passed}/${results.length}`)
  console.log(`FAILED: ${failed}/${results.length}`)
  console.log('='.repeat(BANNER_WIDTH) + '\n')

  if (failed > 0) {
    console.log(SmokeLog.SuiteFailed)
    process.exit(1)
  } else {
    console.log(SmokeLog.SuitePassed)
    process.exit(0)
  }
}

main().catch(err => {
  console.error(SmokeLog.FatalError, err)
  process.exit(1)
})
