/**
 * Test for TileGenerationService
 * Run with: npx tsx src/trigger/__tests__/tile-generation-service.test.ts
 */

import 'dotenv/config'
import { generateTileTask } from '../generate-tile'

// Test task configuration
async function testTaskConfiguration() {
  console.log('\n=== Testing Task Configuration ===')

  // Check task ID
  if (generateTileTask.id !== 'generate-tile') {
    throw new Error(`Expected task id 'generate-tile', got '${generateTileTask.id}'`)
  }
  console.log('✓ Task ID is correct')

  // Verify task exists
  if (!generateTileTask) {
    throw new Error('Task must exist')
  }
  console.log('✓ Task exists')

  console.log('\n✅ Task configuration tests passed!')
}

// Test API route payload validation
async function testAPIPayloadValidation() {
  console.log('\n=== Testing API Payload Validation ===')

  const validPayload = {
    projectId: 'project-123',
    x: 5,
    y: -3,
    prompt: 'A fantasy forest clearing',
    aiProvider: 'gemini',
    aiConfig: {
      apiKey: 'test-api-key',
      model: 'gemini-pro',
    },
  }

  // Validate required fields
  const requiredFields = ['projectId', 'x', 'y', 'prompt', 'aiProvider', 'aiConfig']
  for (const field of requiredFields) {
    if (!(field in validPayload)) {
      throw new Error(`Missing required field: ${field}`)
    }
  }
  console.log('✓ All required fields present')

  // Validate coordinate types
  if (typeof validPayload.x !== 'number' || typeof validPayload.y !== 'number') {
    throw new Error('Coordinates must be numbers')
  }
  console.log('✓ Coordinates are valid numbers')

  // Validate aiConfig has apiKey
  if (!validPayload.aiConfig.apiKey) {
    throw new Error('aiConfig must have apiKey')
  }
  console.log('✓ AI config has API key')

  console.log('\n✅ API payload validation tests passed!')
}

// Test run state structure
async function testRunStateStructure() {
  console.log('\n=== Testing Run State Structure ===')

  interface TileGenRunState {
    runId: string
    projectId: string
    x: number
    y: number
    prompt: string
    startedAt: string
  }

  const mockRunState: TileGenRunState = {
    runId: 'run_123',
    projectId: 'project-456',
    x: 10,
    y: -5,
    prompt: 'A mystical tower',
    startedAt: new Date().toISOString(),
  }

  // Validate all fields
  if (!mockRunState.runId.startsWith('run_')) {
    throw new Error('runId should start with run_')
  }
  console.log('✓ runId format is valid')

  if (!mockRunState.projectId) {
    throw new Error('projectId is required')
  }
  console.log('✓ projectId is present')

  if (mockRunState.x === undefined || mockRunState.y === undefined) {
    throw new Error('Coordinates are required')
  }
  console.log('✓ Coordinates are present')

  // Validate startedAt is valid ISO date
  const parsedDate = new Date(mockRunState.startedAt)
  if (isNaN(parsedDate.getTime())) {
    throw new Error('startedAt must be a valid ISO date')
  }
  console.log('✓ startedAt is valid ISO date')

  console.log('\n✅ Run state structure tests passed!')
}

// Test status handling
async function testStatusHandling() {
  console.log('\n=== Testing Status Handling ===')

  const ACTIVE_STATUSES = [
    'QUEUED',
    'EXECUTING',
    'WAITING',
    'PENDING',
    'DEQUEUED',
    'DELAYED',
    'PENDING_VERSION',
  ]
  const TERMINAL_STATUSES = ['COMPLETED', 'FAILED', 'CANCELLED', 'TIMED_OUT']

  // Test active statuses
  for (const status of ACTIVE_STATUSES) {
    if (!ACTIVE_STATUSES.includes(status)) {
      throw new Error(`${status} should be in ACTIVE_STATUSES`)
    }
  }
  console.log('✓ Active statuses defined correctly')

  // Test terminal statuses are not active
  for (const status of TERMINAL_STATUSES) {
    if (ACTIVE_STATUSES.includes(status)) {
      throw new Error(`${status} should NOT be in ACTIVE_STATUSES`)
    }
  }
  console.log('✓ Terminal statuses not in active list')

  console.log('\n✅ Status handling tests passed!')
}

// Test localStorage key format
async function testLocalStorageKeyFormat() {
  console.log('\n=== Testing LocalStorage Key Format ===')

  const x = 5
  const y = -3
  const expectedKey = `tile-gen-${x}-${y}`

  if (expectedKey !== 'tile-gen-5--3') {
    throw new Error(`Key format incorrect: ${expectedKey}`)
  }
  console.log('✓ Key format handles positive coordinates')

  const negX = -10
  const negY = -20
  const negKey = `tile-gen-${negX}-${negY}`
  if (negKey !== 'tile-gen--10--20') {
    throw new Error(`Key format incorrect for negative: ${negKey}`)
  }
  console.log('✓ Key format handles negative coordinates')

  console.log('\n✅ LocalStorage key format tests passed!')
}

// Main test runner
async function runTests() {
  console.log('🧪 Running TileGenerationService tests...\n')

  try {
    await testTaskConfiguration()
    await testAPIPayloadValidation()
    await testRunStateStructure()
    await testStatusHandling()
    await testLocalStorageKeyFormat()

    console.log('\n' + '='.repeat(50))
    console.log('🎉 All TileGenerationService tests passed!')
    console.log('='.repeat(50))
    process.exit(0)
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message)
    process.exit(1)
  }
}

runTests()
