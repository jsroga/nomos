import { StorytellerTestRunner, TestResult } from './runner'
import { TEST_CASES, TestCase } from './test-cases'

// Simple worker pool implementation
async function runParallel(cases: TestCase[], concurrency: number) {
  const results: { id: string; result: TestResult; testCase: TestCase }[] = []
  const queue = [...cases]
  const activeWorkers = new Set<Promise<void>>()

  console.log(`🚀 Starting ${cases.length} tests with concurrency ${concurrency}...`)
  const startTime = Date.now()

  while (queue.length > 0 || activeWorkers.size > 0) {
    // Fill the pool
    while (activeWorkers.size < concurrency && queue.length > 0) {
      const testCase = queue.shift()!

      const promise = (async () => {
        const runner = new StorytellerTestRunner()
        console.log(`[${testCase.id}] STARTED: ${testCase.description}`)

        try {
          const { fullResponse } = await runner.runChat(testCase.input)

          // Validation Logic
          let passed = true
          let message = 'Passed'

          const isHalting =
            fullResponse.includes('awaiting_input') || fullResponse.includes('Awaiting user input')

          // 1. Halting Checks
          if (testCase.shouldNotHalt && isHalting) {
            passed = false
            message = `FAILED: Halted (awaiting input) when expected to proceed.`
          }

          if (testCase.shouldHalt && !isHalting) {
            passed = false
            message = `FAILED: Proceeded when expected to halt/ask question.`
          }

          // 2. Delegation Check
          if (passed && testCase.expectedDelegation) {
            const hasDelegation = testCase.expectedDelegation.some(
              agent =>
                fullResponse.includes(agent) ||
                fullResponse.toLowerCase().includes(agent.toLowerCase())
            )

            if (!hasDelegation) {
              passed = false
              message = `FAILED: Did not find expected delegation to [${testCase.expectedDelegation.join(', ')}]`
            }
          }

          results.push({
            id: testCase.id,
            testCase,
            result: {
              success: passed,
              message,
              logs: [fullResponse.slice(0, 200) + '...'],
            },
          })

          console.log(`[${testCase.id}] ${passed ? '✅' : '❌'} ${message}`)
        } catch (error: any) {
          results.push({
            id: testCase.id,
            testCase,
            result: {
              success: false,
              message: `CRASH: ${error.message}`,
              logs: [],
            },
          })
          console.log(`[${testCase.id}] ❌ CRASH: ${error.message}`)
        }
      })()

      activeWorkers.add(promise)
      // Remove from set when done
      promise.then(() => activeWorkers.delete(promise))
    }

    // Wait for at least one worker to finish before loop continues
    if (activeWorkers.size > 0) {
      await Promise.race(activeWorkers)
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2)
  console.log(`\n🏁 Suite Completed in ${duration}s`)

  // Summary
  const passed = results.filter(r => r.result.success)
  const failed = results.filter(r => !r.result.success)

  console.log(`\nSUMMARY: ${passed.length}/${cases.length} Passed`)

  if (failed.length > 0) {
    console.log('\n❌ FAILURES:')
    failed.forEach(f => {
      console.log(`- [${f.id}] ${f.testCase.description}: ${f.result.message}`)
      console.log(`  Input: "${f.testCase.input}"`)
      console.log(`  Response preview: ${f.result.logs[0]}`)
    })
    process.exit(1)
  } else {
    console.log('\n✅ ALL TESTS PASSED')
    process.exit(0)
  }
}

// Execute
runParallel(TEST_CASES, 5)
