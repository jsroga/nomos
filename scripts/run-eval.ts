import { spawnSync } from 'child_process'

// Mapping of experiment names to scripts
const EVAL_MAP: Record<string, string> = {
  // === Working Experiment Scripts ===
  'loop-creator': 'npx tsx src/evaluation/experiments/loop-creator.ts',
  storyteller: 'npx tsx src/evaluation/experiments/storyteller-experiments.ts',
  'extended-thinking': 'npx tsx src/evaluation/experiments/extended-thinking-ab-test.ts',
  pro: 'npx tsx src/evaluation/experiments/extended-thinking-ab-test.ts --samples=10',

  // === Full Flow E2E with LLM-as-Judge ===
  'full-flow': 'npx tsx src/evaluation/experiments/run-full-flow-eval.ts',

  // === Architecture & Strategy Experiments ===
  architecture: 'npx tsx src/evaluation/experiments/eval-architecture.ts',
  continuity: 'npx tsx src/evaluation/experiments/eval-continuity.ts',
  reasoning: 'npx tsx src/evaluation/experiments/eval-reasoning.ts',
  'magic-formula': 'npx tsx src/evaluation/experiments/run-magic-formula.ts',
  'sonnet-strategies': 'npx tsx src/evaluation/experiments/run-sonnet-strategies.ts',
  'e2e-simulation': 'npx tsx src/evaluation/experiments/run-e2e-simulation.ts',

  // === Confident AI Cloud Evaluations ===
  'confident-ai': 'npx tsx src/evaluation/confident-ai/run-experiment.ts',
  'confident-ai-quick': 'npx tsx src/evaluation/confident-ai/run-experiment.ts --quick',
  'confident-ai-setup': 'npx tsx src/evaluation/confident-ai/run-experiment.ts --setup',
  'confident-ai-eval': 'npx tsx src/evaluation/confident-ai/run-experiment.ts --eval',
  'confident-ai-ab': 'npx tsx src/evaluation/confident-ai/run-experiment.ts --ab',

  // === Hypothesis-Driven Local DeepEval Evaluations ===
  'hypothesis': 'npx tsx src/evaluation/hypothesis/run-experiment.ts',

  // === Main entry point (via package.json) ===
  'eval-pro': 'npx tsx src/evaluation/experiments/eval-pro.ts',
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
console.log(
  `\n🧪 Running Eval: ${experimentName} \n👉 Command: ${command} ${remainingArgs.join(' ')}\n`
)

const finalCommand = `${command} ${remainingArgs.join(' ')}`
const [cmd, ...cmdArgs] = finalCommand.trim().split(' ')

const result = spawnSync(cmd, cmdArgs, {
  stdio: 'inherit',
  shell: true,
  env: process.env,
})

if (result.status !== 0) {
  process.exit(result.status || 1)
}
