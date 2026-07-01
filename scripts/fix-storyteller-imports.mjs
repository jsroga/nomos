#!/usr/bin/env node
/** Fix sibling imports after component folderization */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const componentsRoot = path.join(ROOT, 'src/domains/storyteller/components')

function listComponentNames() {
  return fs
    .readdirSync(componentsRoot, { withFileTypes: true })
    .filter(d => d.isDirectory() && !['__tests__', 'WorldBible', 'CharacterWeb'].includes(d.name))
    .map(d => d.name)
}

const siblingNames = new Set(listComponentNames())

function fixFile(filePath) {
  let text = fs.readFileSync(filePath, 'utf8')
  const dir = path.dirname(filePath)
  const isLeaf = /\/components\/[^/]+\/[^/]+\.tsx$/.test(filePath)
  if (!isLeaf) return false

  let changed = false
  text = text.replace(/from '(\.\/[^']+)'/g, (match, rel) => {
    const target = rel.slice(2).split('/')[0]
    if (!siblingNames.has(target)) return match
    const abs = path.join(dir, rel)
    if (fs.existsSync(abs) || fs.existsSync(abs + '.tsx') || fs.existsSync(abs + '.ts')) return match
    changed = true
    return `from '../${rel.slice(2)}'`
  })
  text = text.replace(/from "(\.\/[^"]+)"/g, (match, rel) => {
    const target = rel.slice(2).split('/')[0]
    if (!siblingNames.has(target)) return match
    const abs = path.join(dir, rel)
    if (fs.existsSync(abs) || fs.existsSync(abs + '.tsx') || fs.existsSync(abs + '.ts')) return match
    changed = true
    return `from "../${rel.slice(2)}"`
  })

  // WorldBiblePanel: ./WorldBible -> ../WorldBible
  if (path.basename(dir) === 'WorldBiblePanel') {
    const next = text.replace(/from '\.\/WorldBible\//g, "from '../WorldBible/").replace(/from "\.\/WorldBible\//g, 'from "../WorldBible/')
    if (next !== text) {
      text = next
      changed = true
    }
  }

  if (changed) fs.writeFileSync(filePath, text)
  return changed
}

let count = 0
for (const name of siblingNames) {
  const file = path.join(componentsRoot, name, `${name}.tsx`)
  if (fs.existsSync(file) && fixFile(file)) count++
}

// tools service paths
for (const file of fs.readdirSync(path.join(ROOT, 'src/domains/storyteller/tools'))) {
  if (!file.endsWith('.ts')) continue
  const fp = path.join(ROOT, 'src/domains/storyteller/tools', file)
  let t = fs.readFileSync(fp, 'utf8')
  const n = t.replace(/\.\.\/\.\.\/\.\.\/services\//g, '../services/')
  if (n !== t) {
    fs.writeFileSync(fp, n)
    count++
  }
}

// series-bible test
const testFile = path.join(ROOT, 'src/domains/storyteller/services/context/__tests__/series-bible.test.ts')
if (fs.existsSync(testFile)) {
  let t = fs.readFileSync(testFile, 'utf8')
  t = t.replace('../series-bible', './SeriesBible')
  fs.writeFileSync(testFile, t)
  count++
}

console.log(`Fixed ${count} files`)
