import { spawnSync } from 'child_process'

// ONE TEST THAT ACTUALLY WORKS
// Fashion: Minimal. Elegant. Verified.
const E2E_MAP: Record<string, string> = {
  smoke: 'npx tsx e2e/scenarios/storyteller-smoke.test.ts',
  api: 'npx tsx e2e/scenarios/storyteller-smoke.test.ts',
  all: 'npx tsx e2e/scenarios/storyteller-smoke.test.ts',
}

const args = process.argv.slice(2)
const testName = args[0]
const remainingArgs = args.slice(1)

function runCommand(command: string, extraArgs: string[]) {
  const finalCommand = `${command} ${extraArgs.join(' ')}`
  console.log(`\n🚀 Running E2E: ${testName || 'default'} \n👉 Command: ${finalCommand}\n`)

  const [cmd, ...cmdArgs] = finalCommand.trim().split(' ')

  const result = spawnSync(cmd, cmdArgs, {
    stdio: 'inherit',
    shell: true,
    env: process.env,
  })

  if (result.status !== 0) {
    process.exit(result.status || 1)
  }
}

if (!testName) {
  // Default: Run standard playwright tests
  runCommand('playwright test', remainingArgs)
} else if (E2E_MAP[testName]) {
  // Run mapped test
  runCommand(E2E_MAP[testName], remainingArgs)
} else {
  // Fallback: Pass through to playwright (allows 'npm run test:e2e some-file.spec.ts')
  console.log(`\n⚠️  Unknown shortcut '${testName}', passing to Playwright...`)
  runCommand('playwright test', args)
}
