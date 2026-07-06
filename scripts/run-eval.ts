import { spawnSync } from 'child_process'

const args = process.argv.slice(2)

// Forward all args to evals/run.ts
const result = spawnSync('npx', ['tsx', 'evals/run.ts', ...args], {
  stdio: 'inherit',
  shell: true,
  env: process.env,
})

if (result.status !== 0) {
  process.exit(result.status || 1)
}
