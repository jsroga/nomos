#!/usr/bin/env node
/**
 * Storyteller domain structure normalization:
 * - hooks/ and mentions/ at domain root
 * - tools/v2 flattened to tools/
 * - db/schema out of services/
 * - services/lib → domain lib/
 * - kebab-case services → PascalCase
 * - context helpers under services/context/
 * - flat components → one folder per component (with index.ts)
 */
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { Project } from 'ts-morph'

const ROOT = process.cwd()
const DOMAIN = path.join(ROOT, 'src/domains/storyteller')

function mv(from, to) {
  const absFrom = path.join(ROOT, from)
  const absTo = path.join(ROOT, to)
  if (!fs.existsSync(absFrom)) {
    console.warn(`skip missing: ${from}`)
    return
  }
  fs.mkdirSync(path.dirname(absTo), { recursive: true })
  try {
    execSync(`git mv "${absFrom}" "${absTo}"`, { cwd: ROOT, stdio: 'pipe' })
  } catch {
    fs.renameSync(absFrom, absTo)
  }
  console.log(`mv ${from} → ${to}`)
}

// ensure target dirs
for (const d of [
  'src/domains/storyteller/hooks',
  'src/domains/storyteller/mentions',
  'src/domains/storyteller/db',
  'src/domains/storyteller/lib',
  'src/domains/storyteller/tools/__tests__',
]) {
  fs.mkdirSync(path.join(ROOT, d), { recursive: true })
}

// ── 1. hooks & mentions ──────────────────────────────────────────────
for (const file of fs.readdirSync(path.join(DOMAIN, 'components/hooks'))) {
  if (file.endsWith('.ts')) {
    mv(`src/domains/storyteller/components/hooks/${file}`, `src/domains/storyteller/hooks/${file}`)
  }
}
mv(
  'src/domains/storyteller/components/mentions/providers.ts',
  'src/domains/storyteller/mentions/providers.ts'
)

// ── 2. db + lib ──────────────────────────────────────────────────────
mv('src/domains/storyteller/services/db/schema.ts', 'src/domains/storyteller/db/schema.ts')
for (const file of fs.readdirSync(path.join(DOMAIN, 'services/lib'))) {
  mv(`src/domains/storyteller/services/lib/${file}`, `src/domains/storyteller/lib/${file}`)
}

// ── 3. flatten tools/v2 ──────────────────────────────────────────────
const toolsV2 = path.join(DOMAIN, 'tools/v2')
for (const entry of fs.readdirSync(toolsV2, { withFileTypes: true })) {
  if (entry.name === '__tests__') {
    for (const t of fs.readdirSync(path.join(toolsV2, '__tests__'))) {
      mv(
        `src/domains/storyteller/tools/v2/__tests__/${t}`,
        `src/domains/storyteller/tools/__tests__/${t}`
      )
    }
    continue
  }
  if (entry.isFile()) {
    mv(`src/domains/storyteller/tools/v2/${entry.name}`, `src/domains/storyteller/tools/${entry.name}`)
  }
}

// ── 4. service renames ───────────────────────────────────────────────
const serviceRenames = [
  ['beat-image-service.ts', 'BeatImageService.ts'],
  ['context-assembly.ts', 'ContextAssemblyService.ts'],
  ['contextual-summary-service.ts', 'ContextualSummaryService.ts'],
  ['entity-auto-linker.ts', 'EntityAutoLinkerService.ts'],
  ['entity-graph-service.ts', 'EntityGraphService.ts'],
  ['entity-registry.ts', 'EntityRegistryService.ts'],
  ['rag-service.ts', 'RagService.ts'],
  ['reference-validator.ts', 'ReferenceValidatorService.ts'],
  ['relationship-enricher.ts', 'RelationshipEnricherService.ts'],
  ['script-operations.ts', 'ScriptOperationsService.ts'],
]
for (const [from, to] of serviceRenames) {
  mv(`src/domains/storyteller/services/${from}`, `src/domains/storyteller/services/${to}`)
}

mv(
  'src/domains/storyteller/services/context/series-bible.ts',
  'src/domains/storyteller/services/context/SeriesBible.ts'
)

// ── 5. component folders (flat .tsx only) ────────────────────────────
const componentsDir = path.join(DOMAIN, 'components')
const skipDirs = new Set(['WorldBible', 'CharacterWeb', '__tests__', 'hooks', 'mentions'])
for (const entry of fs.readdirSync(componentsDir, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.tsx')) continue
  const base = entry.name.replace(/\.tsx$/, '')
  const folder = `src/domains/storyteller/components/${base}`
  mv(`src/domains/storyteller/components/${entry.name}`, `${folder}/${entry.name}`)
  const componentPath = path.join(ROOT, folder, entry.name)
  const content = fs.readFileSync(componentPath, 'utf8')
  const hasDefault = /export\s+default\b/.test(content)
  const indexLines = [`export * from './${base}'`]
  if (hasDefault) indexLines.push(`export { default } from './${base}'`)
  indexLines.push('')
  const indexPath = path.join(ROOT, folder, 'index.ts')
  fs.writeFileSync(indexPath, indexLines.join('\n'))
  execSync(`git add "${folder}/index.ts"`, { cwd: ROOT })
}

// ── 6. update imports repo-wide ──────────────────────────────────────
const replacements = [
  [/\@\/domains\/storyteller\/components\/hooks\//g, '@/domains/storyteller/hooks/'],
  [/\@\/domains\/storyteller\/components\/mentions\//g, '@/domains/storyteller/mentions/'],
  [/\@\/domains\/storyteller\/tools\/v2\//g, '@/domains/storyteller/tools/'],
  [/\@\/domains\/storyteller\/tools\/v2'/g, "@/domains/storyteller/tools'"],
  [/\@\/domains\/storyteller\/services\/db\/schema/g, '@/domains/storyteller/db/schema'],
  [/\@\/domains\/storyteller\/services\/lib\//g, '@/domains/storyteller/lib/'],
  [/\@\/domains\/storyteller\/services\/beat-image-service/g, '@/domains/storyteller/services/BeatImageService'],
  [/\@\/domains\/storyteller\/services\/context-assembly/g, '@/domains/storyteller/services/ContextAssemblyService'],
  [
    /\@\/domains\/storyteller\/services\/contextual-summary-service/g,
    '@/domains/storyteller/services/ContextualSummaryService',
  ],
  [/\@\/domains\/storyteller\/services\/entity-auto-linker/g, '@/domains/storyteller/services/EntityAutoLinkerService'],
  [/\@\/domains\/storyteller\/services\/entity-graph-service/g, '@/domains/storyteller/services/EntityGraphService'],
  [/\@\/domains\/storyteller\/services\/entity-registry/g, '@/domains/storyteller/services/EntityRegistryService'],
  [/\@\/domains\/storyteller\/services\/rag-service/g, '@/domains/storyteller/services/RagService'],
  [
    /\@\/domains\/storyteller\/services\/reference-validator/g,
    '@/domains/storyteller/services/ReferenceValidatorService',
  ],
  [
    /\@\/domains\/storyteller\/services\/relationship-enricher/g,
    '@/domains/storyteller/services/RelationshipEnricherService',
  ],
  [/\@\/domains\/storyteller\/services\/script-operations/g, '@/domains/storyteller/services/ScriptOperationsService'],
  [/\@\/domains\/storyteller\/services\/context\/series-bible/g, '@/domains/storyteller/services/context/SeriesBible'],
  [/\.\.\/services\/beat-image-service/g, '../../services/BeatImageService'],
  [/\.\.\/\.\.\/services\/beat-image-service/g, '../../../services/BeatImageService'],
  [/\.\.\/services\/script-operations/g, '../../services/ScriptOperationsService'],
  [/\.\.\/\.\.\/services\/script-operations/g, '../../../services/ScriptOperationsService'],
  [/\.\.\/services\/reference-validator/g, '../../services/ReferenceValidatorService'],
  [/\.\.\/\.\.\/services\/reference-validator/g, '../../../services/ReferenceValidatorService'],
  [/\.\.\/services\/rag-service/g, '../../services/RagService'],
  [/\.\.\/\.\.\/services\/rag-service/g, '../../../services/RagService'],
  [/\.\/entity-registry/g, './EntityRegistryService'],
  [/\.\/entity-graph-service/g, './EntityGraphService'],
  [/\.\/relationship-enricher/g, './RelationshipEnricherService'],
  [/\.\/reference-validator/g, './ReferenceValidatorService'],
  [/\.\/entity-graph-service/g, './EntityGraphService'],
  [/\.\/rag-service/g, './RagService'],
  [/\.\/series-bible/g, './SeriesBible'],
  [/\.\/token-budget/g, './token-budget'],
]

function walkTs(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next', 'dist'].includes(e.name)) continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walkTs(p, out)
    else if (/\.(ts|tsx|js|mjs)$/.test(e.name)) out.push(p)
  }
  return out
}

for (const file of walkTs(path.join(ROOT, 'src'))) {
  let text = fs.readFileSync(file, 'utf8')
  let changed = false
  for (const [pattern, replacement] of replacements) {
    if (pattern.test(text)) {
      text = text.replace(pattern, replacement)
      changed = true
    }
  }
  if (changed) fs.writeFileSync(file, text)
}

// Fix tools/index comment
const toolsIndex = path.join(DOMAIN, 'tools/index.ts')
if (fs.existsSync(toolsIndex)) {
  let t = fs.readFileSync(toolsIndex, 'utf8')
  t = t.replace('Storyteller Tools v2', 'Storyteller Tools')
  fs.writeFileSync(toolsIndex, t)
}

// Fix relative imports inside moved component folders (./X → same, ../sibling → ../Sibling)
const project = new Project({ tsConfigFilePath: 'tsconfig.json' })
project.addSourceFilesAtPaths('src/domains/storyteller/components/**/*.tsx')

for (const sf of project.getSourceFiles()) {
  const dir = path.dirname(sf.getFilePath())
  const isComponentLeaf = /\/components\/[^/]+\/[^/]+\.tsx$/.test(sf.getFilePath())
  if (!isComponentLeaf) continue

  for (const spec of sf.getImportDeclarations()) {
    const mod = spec.getModuleSpecifierValue()
    if (!mod.startsWith('.')) continue
    const resolved = path.resolve(dir, mod)
    const candidates = [
      resolved + '.tsx',
      resolved + '.ts',
      path.join(resolved, 'index.ts'),
    ]
    if (candidates.some(c => fs.existsSync(c))) continue

    // ../Foo -> ../Foo (sibling folder) when Foo.tsx moved to Foo/Foo.tsx
    const parts = mod.split('/')
    const last = parts[parts.length - 1]
    if (last.startsWith('.')) continue
    const siblingFolder = path.join(path.dirname(resolved), last)
    if (fs.existsSync(path.join(siblingFolder, `${last}.tsx`))) {
      spec.setModuleSpecifier(mod) // already correct path to folder
    } else if (fs.existsSync(path.join(path.dirname(resolved), '..', last, `${last}.tsx`))) {
      // same
    }
  }

  // Fix ../services paths from nested component (one more level up)
  let text = sf.getFullText()
  const fixed = text
    .replace(/from '\.\.\/services\//g, "from '../../services/")
    .replace(/from "\.\.\/services\//g, 'from "../../services/')
    .replace(/from '\.\.\/hooks\//g, "from '../../hooks/")
    .replace(/from '\.\.\/config\//g, "from '../../config/")
    .replace(/from '\.\.\/core\//g, "from '../../core/")
  if (fixed !== text) sf.replaceWithText(fixed)
}

project.saveSync()

// Remove empty dirs
for (const d of [
  'src/domains/storyteller/components/hooks',
  'src/domains/storyteller/components/mentions',
  'src/domains/storyteller/services/db',
  'src/domains/storyteller/services/lib',
  'src/domains/storyteller/tools/v2',
]) {
  const p = path.join(ROOT, d)
  if (fs.existsSync(p) && fs.readdirSync(p).length === 0) {
    fs.rmdirSync(p)
  }
}

console.log('Storyteller structure reorg complete.')
