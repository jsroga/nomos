/**
 * Skill Loader - Loads SKILL.md files and references for agents
 *
 * Mastra-style skills provide reusable context and instructions.
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import {
  SKILL_LOADER_ENCODING,
  SKILL_LOADER_SEPARATOR,
  SkillDirectory,
  SkillFileExtension,
  SkillFileName,
} from '@/shared/agent-kernel/constants/skill-loader'

/**
 * Location of agent skill files, relative to the project root (process.cwd()).
 * Skills are storyteller/narrative-specific, so they live inside that domain.
 * Single source of truth — referenced by mastra-instance and validate-skills.
 */
export const SKILLS_DIR = 'src/domains/storyteller/prompts/skills'

export { SkillEvalCaseSchema, SkillEvalsFileSchema } from './eval-schema'

export interface Skill {
  name: string
  content: string
  references: Map<string, string>
}

/**
 * Load a skill from the skills directory
 */
export async function loadSkill(skillName: string): Promise<Skill | null> {
  const skillPath = path.join(process.cwd(), SKILLS_DIR, skillName)

  try {
    // Load main SKILL.md
    const skillMdPath = path.join(skillPath, SkillFileName.Main)
    const content = await fs.readFile(skillMdPath, SKILL_LOADER_ENCODING)

    // Load references
    const references = new Map<string, string>()
    const referencesPath = path.join(skillPath, SkillDirectory.References)

    try {
      const refFiles = await fs.readdir(referencesPath)
      for (const refFile of refFiles) {
        if (refFile.endsWith(SkillFileExtension.Markdown)) {
          const refPath = path.join(referencesPath, refFile)
          const refContent = await fs.readFile(refPath, SKILL_LOADER_ENCODING)
          references.set(refFile.replace(SkillFileExtension.Markdown, ''), refContent)
        }
      }
    } catch {
      // No references folder, that's OK
    }

    return {
      name: skillName,
      content,
      references,
    }
  } catch (error) {
    console.warn(`Failed to load skill "${skillName}":`, error)
    return null
  }
}

/**
 * Load multiple skills
 */
export async function loadSkills(skillNames: string[]): Promise<Skill[]> {
  const skills: Skill[] = []

  for (const name of skillNames) {
    const skill = await loadSkill(name)
    if (skill) {
      skills.push(skill)
    }
  }

  return skills
}

/**
 * Format skill for system prompt inclusion
 */
export function formatSkillForPrompt(skill: Skill, includeReferences: boolean = true): string {
  let formatted = `# ${skill.name.charAt(0).toUpperCase() + skill.name.slice(1)} Skill\n\n`
  formatted += skill.content

  if (includeReferences && skill.references.size > 0) {
    formatted += SKILL_LOADER_SEPARATOR.ReferenceBlock
    for (const [refName, refContent] of skill.references) {
      formatted += `### ${refName}\n\n${refContent}\n\n`
    }
  }

  return formatted
}

/**
 * Build a combined prompt from multiple skills
 */
export function buildSkillsPrompt(skills: Skill[], includeReferences: boolean = true): string {
  return skills.map(s => formatSkillForPrompt(s, includeReferences)).join(SKILL_LOADER_SEPARATOR.SkillsJoin)
}

/**
 * List available skills
 */
export async function listAvailableSkills(): Promise<string[]> {
  const skillsPath = path.join(process.cwd(), SKILLS_DIR)

  try {
    const entries = await fs.readdir(skillsPath, { withFileTypes: true })
    return entries.filter(e => e.isDirectory()).map(e => e.name)
  } catch {
    return []
  }
}
