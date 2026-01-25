import { spawnSync } from 'child_process'

// Mapping of experiment names to scripts
const EVAL_MAP: Record<string, string> = {
    all: 'npx tsx src/evaluation/experiments/run-all.ts',
    'loop-creator': 'npx tsx src/evaluation/experiments/loop-creator.ts',
    monitor: 'npx tsx src/evaluation/online/monitor.ts',
    storyteller: 'npx tsx src/evaluation/experiments/storyteller.ts',
    'storyteller:fast': 'npx tsx src/evaluation/experiments/parallel-storyteller.ts --fast',
    'storyteller:full': 'npx tsx src/evaluation/experiments/parallel-storyteller.ts --full',
    regression: 'npx tsx src/evaluation/regression/detector.ts',
    'upload-datasets': 'npx tsx src/evaluation/datasets/upload.ts',
    tools: 'npx tsx src/evaluation/experiments/tools.ts',
    'tools:single': 'npx tsx src/evaluation/experiments/tools.ts',
}

const args = process.argv.slice(2)
const experimentName = args[0]
const remainingArgs = args.slice(1)

if (!experimentName) {
    console.error('\n❌ Error: No experiment specified.')
    console.error('Usage: npm run eval <experiment-name> [args]')
    console.error('\nAvailable experiments:')
    Object.keys(EVAL_MAP).forEach(key => console.error(`  - ${key}`))
    process.exit(1)
}

if (!EVAL_MAP[experimentName]) {
    console.error(`\n❌ Error: Unknown experiment '${experimentName}'`)
    console.error('\nAvailable experiments:')
    Object.keys(EVAL_MAP).forEach(key => console.error(`  - ${key}`))
    process.exit(1)
}

const command = EVAL_MAP[experimentName]
console.log(`\n🧪 Running Eval: ${experimentName} \n👉 Command: ${command} ${remainingArgs.join(' ')}\n`)

const finalCommand = `${command} ${remainingArgs.join(' ')}`
const [cmd, ...cmdArgs] = finalCommand.trim().split(' ')

const result = spawnSync(cmd, cmdArgs, {
    stdio: 'inherit',
    shell: true,
    env: process.env
})

if (result.status !== 0) {
    process.exit(result.status || 1)
}
