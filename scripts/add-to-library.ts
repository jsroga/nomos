/**
 * CLI script to add 3D models to the library
 *
 * Usage:
 *   npx ts-node scripts/add-to-library.ts <path-to-model> --name "Model Name" --category terrain
 *
 * Options:
 *   --name        Required. Display name for the model
 *   --category    Optional. One of: terrain, props, characters, buildings, vehicles, effects
 *   --tags        Optional. Comma-separated tags
 *   --featured    Optional. Mark as featured
 */

import * as fs from 'fs'
import * as path from 'path'

const LIBRARY_DIR = path.join(process.cwd(), 'public/library')
const MANIFEST_PATH = path.join(LIBRARY_DIR, 'manifest.json')
const MODELS_DIR = path.join(LIBRARY_DIR, 'models')

function parseArgs(args: string[]) {
  const result: Record<string, string | boolean> = {}
  let modelPath = ''

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      const next = args[i + 1]
      if (next && !next.startsWith('--')) {
        result[key] = next
        i++
      } else {
        result[key] = true
      }
    } else if (!modelPath) {
      modelPath = arg
    }
  }

  return { modelPath, ...result }
}

async function main() {
  const args = process.argv.slice(2)
  const { modelPath, name, category, tags, featured } = parseArgs(args)

  if (!modelPath || !name) {
    console.error('Usage: npx ts-node scripts/add-to-library.ts <model-path> --name "Name"')
    console.error('Options: --category, --tags, --featured')
    process.exit(1)
  }

  // Check if model exists
  if (!fs.existsSync(modelPath)) {
    console.error(`File not found: ${modelPath}`)
    process.exit(1)
  }

  // Generate ID from filename
  const ext = path.extname(modelPath)
  const basename = path.basename(modelPath, ext)
  const id = basename.toLowerCase().replace(/[^a-z0-9]+/g, '-')

  // Copy model to library
  const destPath = path.join(MODELS_DIR, `${id}${ext}`)
  fs.copyFileSync(modelPath, destPath)
  console.log(`✓ Copied model to ${destPath}`)

  // Read manifest
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'))

  // Create asset entry
  const asset = {
    id,
    name: name as string,
    description: '',
    category: (category as string) || 'props',
    tags: tags ? (tags as string).split(',').map(t => t.trim()) : [],
    file: `models/${id}${ext}`,
    thumbnail: `thumbnails/${id}.png`,
    format: ext.slice(1),
    createdAt: new Date().toISOString().split('T')[0],
    featured: !!featured,
  }

  // Check for duplicate
  const existingIndex = manifest.assets.findIndex((a: any) => a.id === id)
  if (existingIndex >= 0) {
    manifest.assets[existingIndex] = asset
    console.log(`✓ Updated existing asset: ${id}`)
  } else {
    manifest.assets.push(asset)
    console.log(`✓ Added new asset: ${id}`)
  }

  // Write manifest
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2))
  console.log('✓ Updated manifest')

  console.log(`\n📦 Asset "${name}" added to library!`)
  console.log(`   ID: ${id}`)
  console.log(`   Path: /library/${asset.file}`)
  console.log(`\n⚠️  Don't forget to add a thumbnail: public/library/thumbnails/${id}.png`)
}

main().catch(console.error)
