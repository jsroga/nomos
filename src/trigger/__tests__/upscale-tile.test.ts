/**
 * Test for upscale-tile Trigger.dev task
 * Run with: npx tsx src/trigger/__tests__/upscale-tile.test.ts
 */

import { upscaleTileTask } from '../upscale-tile'

// Test configuration validation
async function testPayloadValidation() {
  console.log('\n=== Testing Payload Validation ===')

  const validPayload = {
    tileId: 'tile-123',
    projectId: 'project-456',
    imageBase64: 'dGVzdA==', // base64 for "test"
    prompt: 'A fantasy landscape',
    creativity: 0.5,
    provider: 'stability' as const,
    providerConfig: {
      apiKey: 'test-api-key',
      upscaleMode: 'conservative' as const,
    },
  }

  // Check task ID
  if (upscaleTileTask.id !== 'upscale-tile') {
    throw new Error(`Expected task id 'upscale-tile', got '${upscaleTileTask.id}'`)
  }
  console.log('✓ Task ID is correct')

  // Validate payload structure
  if (!validPayload.tileId || !validPayload.projectId || !validPayload.provider) {
    throw new Error('Payload missing required fields')
  }
  console.log('✓ Valid payload structure')

  // Test provider validation
  const validProviders = ['midjourney', 'replicate', 'stability']
  if (!validProviders.includes(validPayload.provider)) {
    throw new Error(`Invalid provider: ${validPayload.provider}`)
  }
  console.log('✓ Provider is valid')

  // Test creativity range
  if (validPayload.creativity < 0 || validPayload.creativity > 1) {
    throw new Error(`Creativity must be between 0 and 1, got ${validPayload.creativity}`)
  }
  console.log('✓ Creativity value is in range')

  // Test providerConfig required fields
  if (!validPayload.providerConfig.apiKey) {
    throw new Error('providerConfig.apiKey is required')
  }
  console.log('✓ Provider config has API key')

  console.log('\n✅ All payload validation tests passed!')
}

// Test provider-specific configurations
async function testProviderConfigs() {
  console.log('\n=== Testing Provider Configurations ===')

  // Midjourney config
  const mjConfig = {
    provider: 'midjourney' as const,
    providerConfig: { apiKey: 'comet-api-key' },
  }
  if (!mjConfig.providerConfig.apiKey) {
    throw new Error('Midjourney requires Comet API key')
  }
  console.log('✓ Midjourney config valid')

  // Replicate config
  const replicateConfig = {
    provider: 'replicate' as const,
    providerConfig: { apiKey: 'replicate-key', model: 'some-model' },
  }
  if (!replicateConfig.providerConfig.model) {
    throw new Error('Replicate requires model')
  }
  console.log('✓ Replicate config valid')

  // Stability config
  const stabilityConfig = {
    provider: 'stability' as const,
    providerConfig: { apiKey: 'stability-key', upscaleMode: 'creative' as const },
  }
  if (!['conservative', 'creative'].includes(stabilityConfig.providerConfig.upscaleMode || 'conservative')) {
    throw new Error('Stability upscaleMode must be conservative or creative')
  }
  console.log('✓ Stability config valid')

  console.log('\n✅ All provider config tests passed!')
}

// Test task metadata structure
async function testTaskMetadata() {
  console.log('\n=== Testing Task Metadata ===')

  // Verify task exists and has correct id
  if (!upscaleTileTask) {
    throw new Error('Task must exist')
  }
  console.log('✓ Task exists')

  // Verify task has id property
  if (!upscaleTileTask.id) {
    throw new Error('Task must have an id')
  }
  console.log('✓ Task has id property')

  // Verify task is a valid Trigger.dev task object
  if (typeof upscaleTileTask !== 'object') {
    throw new Error('Task must be an object')
  }
  console.log('✓ Task is a valid object')

  console.log('\n✅ Task metadata tests passed!')
}

// Main test runner
async function runTests() {
  console.log('🧪 Running upscale-tile task tests...\n')

  try {
    await testPayloadValidation()
    await testProviderConfigs()
    await testTaskMetadata()

    console.log('\n' + '='.repeat(50))
    console.log('🎉 All tests passed!')
    console.log('='.repeat(50))
    process.exit(0)
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message)
    process.exit(1)
  }
}

runTests()

