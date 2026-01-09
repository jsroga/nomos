/**
 * Run All Experiments
 * 
 * Executes all evaluation experiments in sequence.
 * 
 * Usage: npm run eval:all
 */

import { runStorytellerExperiment } from './storyteller'
import { runLoopCreatorExperiment } from './loop-creator'

interface ExperimentResult {
  name: string
  success: boolean
  duration: number
  error?: string
}

export async function runAllExperiments() {
  console.log('🚀 Running All Evaluation Experiments')
  console.log('=====================================')
  console.log('')

  const results: ExperimentResult[] = []

  // Storyteller Experiment
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('1. STORYTELLER EXPERIMENT')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  const storytellerStart = Date.now()
  try {
    await runStorytellerExperiment()
    results.push({
      name: 'Storyteller',
      success: true,
      duration: Date.now() - storytellerStart,
    })
  } catch (error) {
    results.push({
      name: 'Storyteller',
      success: false,
      duration: Date.now() - storytellerStart,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  console.log('')

  // Loop Creator Experiment
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('2. LOOP CREATOR EXPERIMENT')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  const loopCreatorStart = Date.now()
  try {
    await runLoopCreatorExperiment()
    results.push({
      name: 'Loop Creator',
      success: true,
      duration: Date.now() - loopCreatorStart,
    })
  } catch (error) {
    results.push({
      name: 'Loop Creator',
      success: false,
      duration: Date.now() - loopCreatorStart,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  console.log('')

  // Summary
  console.log('=====================================')
  console.log('📊 ALL EXPERIMENTS SUMMARY')
  console.log('=====================================')

  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0)
  const successCount = results.filter((r) => r.success).length

  console.log(`Total: ${successCount}/${results.length} experiments succeeded`)
  console.log(`Total Duration: ${(totalDuration / 1000).toFixed(1)}s`)
  console.log('')

  for (const result of results) {
    const status = result.success ? '✅' : '❌'
    const duration = (result.duration / 1000).toFixed(1)
    console.log(`${status} ${result.name}: ${duration}s`)
    if (result.error) {
      console.log(`   Error: ${result.error}`)
    }
  }

  console.log('')
  console.log('🔗 View detailed results at: https://smith.langchain.com')

  // Return overall success
  return results.every((r) => r.success)
}

// Run if executed directly
if (require.main === module) {
  runAllExperiments()
    .then((success) => process.exit(success ? 0 : 1))
    .catch((err) => {
      console.error('Fatal error:', err)
      process.exit(1)
    })
}

