#!/usr/bin/env node
/**
 * Build marketing LOD GLBs under public/3d-models/lite/.
 * Keeps full sources untouched. Icons only sample geometry (point clouds),
 * so we aggressively simplify and shrink textures — no Draco/Meshopt
 * (avoids extra decoder wiring in drei).
 *
 *   npm run marketing:glb-lite
 */
import { mkdirSync, existsSync, statSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public/3d-models/lite')
mkdirSync(outDir, { recursive: true })

const JOBS = [
  {
    src: 'Meshy_AI_Generate_the_cosmos__0120111501_texture.glb',
    out: 'cosmos.glb',
    ratio: 0.4,
    texture: 256,
  },
  {
    src: 'Meshy_AI_Neural_Connections_0120093533_texture.glb',
    out: 'neural-connections.glb',
    ratio: 0.1,
    texture: 256,
  },
  {
    src: 'Meshy_AI_Enchanted_Cosmos_Code_0120111422_texture.glb',
    out: 'enchanted-cosmos.glb',
    ratio: 0.18,
    texture: 256,
  },
  {
    src: 'Meshy_AI_Predator_of_the_Cosmo_0120111442_texture.glb',
    out: 'predator-cosmos.glb',
    ratio: 0.18,
    texture: 256,
  },
  {
    src: 'Meshy_AI_Oceanic_Cosmos_Predat_0120111415_texture.glb',
    out: 'oceanic-cosmos.glb',
    ratio: 0.08,
    texture: 256,
  },
  {
    src: 'Meshy_AI_Realistic_14k_textur_0120110958_texture.glb',
    out: 'realistic-14k.glb',
    ratio: 0.18,
    texture: 256,
  },
]

function fmtMb(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const ready = []

for (const job of JOBS) {
  const input = join(root, 'public/3d-models', job.src)
  const output = join(outDir, job.out)
  if (!existsSync(input)) {
    console.warn(`skip missing ${job.src}`)
    continue
  }

  console.log(`\n→ ${job.src} → lite/${job.out}`)
  const before = statSync(input).size

  const args = [
    '--yes',
    '@gltf-transform/cli',
    'optimize',
    input,
    output,
    '--compress',
    'false',
    '--texture-compress',
    'webp',
    '--texture-size',
    String(job.texture),
    '--simplify',
    'true',
    '--simplify-ratio',
    String(job.ratio),
    '--simplify-error',
    '0.001',
  ]

  const result = spawnSync(npx, args, { stdio: 'inherit', cwd: root })
  if (result.status !== 0) {
    console.error(`FAILED ${job.out} (exit ${result.status})`)
    process.exitCode = 1
    continue
  }

  if (existsSync(output)) {
    const after = statSync(output).size
    console.log(`  ${fmtMb(before)} → ${fmtMb(after)}`)
    ready.push(job.out)
  }
}

writeFileSync(
  join(outDir, 'ready.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), files: ready }, null, 2)
)

console.log('\nDone. Runtime: resolveMarketingModelUrl → /3d-models/lite/*')
