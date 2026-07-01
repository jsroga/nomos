/**
 * Validates storyteller SKILL.md files and evals/evals.json per
 * https://agentskills.io/skill-creation/evaluating-skills
 */
import * as fs from 'fs'
import * as path from 'path'
import * as glob from 'glob'
import { SKILLS_DIR } from '../src/agent-core/skills/skill-loader'
import { SkillEvalsFileSchema } from '../src/agent-core/skills/eval-schema'

interface SkillMetadata {
  name: string
  description: string
  version: string
  tags: string[]
}

function parseFrontmatter(content: string): SkillMetadata | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return null

  const frontmatter = match[1]
  const metadata: Partial<SkillMetadata> = { tags: [] }

  frontmatter.split('\n').forEach(line => {
    const [key, ...values] = line.split(':')
    if (!key || values.length === 0) return

    const trimmedKey = key.trim() as keyof SkillMetadata
    let value = values.join(':').trim()

    if (trimmedKey === 'tags') {
      return
    }

    if (line.trim().startsWith('- ') && metadata.tags) {
      metadata.tags.push(line.trim().substring(2))
      return
    }

    if (['name', 'description', 'version'].includes(trimmedKey)) {
      value = value.replace(/^["']|["']$/g, '')
      ;(metadata as Record<string, string>)[trimmedKey] = value
    }
  })

  return metadata as SkillMetadata
}

function validateEvals(skillDir: string, skillFolderName: string): string[] {
  const errors: string[] = []
  const evalsPath = path.join(skillDir, 'evals', 'evals.json')

  if (!fs.existsSync(evalsPath)) {
    errors.push('missing evals/evals.json (required by skill evaluation model)')
    return errors
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(fs.readFileSync(evalsPath, 'utf-8'))
  } catch {
    errors.push('evals/evals.json is not valid JSON')
    return errors
  }

  const result = SkillEvalsFileSchema.safeParse(parsed)
  if (!result.success) {
    errors.push(`evals/evals.json schema: ${result.error.issues.map(i => i.message).join('; ')}`)
    return errors
  }

  if (result.data.skill_name !== skillFolderName) {
    errors.push(
      `evals skill_name "${result.data.skill_name}" must match folder name "${skillFolderName}"`
    )
  }

  for (const evalCase of result.data.evals) {
    if (evalCase.files) {
      for (const file of evalCase.files) {
        const filePath = path.join(skillDir, file)
        if (!fs.existsSync(filePath)) {
          errors.push(`eval ${evalCase.id}: missing input file ${file}`)
        }
      }
    }
  }

  return errors
}

function validateSkills() {
  const skillsDir = path.resolve(process.cwd(), SKILLS_DIR)
  console.log(`🔍 Validating skills in: ${skillsDir}`)

  const skillFiles = glob.sync('**/SKILL.md', { cwd: skillsDir, absolute: true })

  if (skillFiles.length === 0) {
    console.error('❌ No SKILL.md files found!')
    process.exit(1)
  }

  let errors = 0

  skillFiles.forEach(file => {
    const skillDir = path.dirname(file)
    const skillFolderName = path.basename(skillDir)
    const relativePath = path.relative(process.cwd(), file)
    const content = fs.readFileSync(file, 'utf-8')
    const metadata = parseFrontmatter(content)

    if (!metadata) {
      console.error(`❌ [${relativePath}] Missing or invalid YAML frontmatter`)
      errors++
      return
    }

    const missingFields = []
    if (!metadata.name) missingFields.push('name')
    if (!metadata.description) missingFields.push('description')
    if (!metadata.version) missingFields.push('version')

    if (missingFields.length > 0) {
      console.error(`❌ [${relativePath}] Missing required fields: ${missingFields.join(', ')}`)
      errors++
      return
    }

    if (metadata.name !== skillFolderName) {
      console.error(
        `❌ [${relativePath}] frontmatter name "${metadata.name}" must match folder "${skillFolderName}"`
      )
      errors++
      return
    }

    const evalErrors = validateEvals(skillDir, skillFolderName)
    if (evalErrors.length > 0) {
      for (const err of evalErrors) {
        console.error(`❌ [${skillFolderName}] ${err}`)
      }
      errors += evalErrors.length
      return
    }

    const evals = JSON.parse(fs.readFileSync(path.join(skillDir, 'evals', 'evals.json'), 'utf-8'))
    console.log(
      `✅ [${relativePath}] Valid — ${evals.evals.length} eval case(s), workspace: ${skillFolderName}-workspace/`
    )
  })

  if (errors > 0) {
    console.error(`\nFound ${errors} error(s).`)
    process.exit(1)
  }

  console.log('\n✨ All skills and evals validated successfully!')
  console.log(
    '   Run eval iterations into <skill>-workspace/iteration-N/ (with_skill + without_skill) per agentskills.io'
  )
}

validateSkills()
