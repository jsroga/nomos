/**
 * Skill Loader - Loads SKILL.md files and references for agents
 *
 * Mastra-style skills provide reusable context and instructions.
 */

import * as fs from 'fs/promises'
import * as path from 'path'

export interface Skill {
    name: string
    content: string
    references: Map<string, string>
}

export interface SkillReference {
    name: string
    content: string
}

/**
 * Load a skill from the skills directory
 */
export async function loadSkill(skillName: string): Promise<Skill | null> {
    const skillPath = path.join(process.cwd(), 'skills', skillName)

    try {
        // Load main SKILL.md
        const skillMdPath = path.join(skillPath, 'SKILL.md')
        const content = await fs.readFile(skillMdPath, 'utf-8')

        // Load references
        const references = new Map<string, string>()
        const referencesPath = path.join(skillPath, 'references')

        try {
            const refFiles = await fs.readdir(referencesPath)
            for (const refFile of refFiles) {
                if (refFile.endsWith('.md')) {
                    const refPath = path.join(referencesPath, refFile)
                    const refContent = await fs.readFile(refPath, 'utf-8')
                    references.set(refFile.replace('.md', ''), refContent)
                }
            }
        } catch {
            // No references folder, that's OK
        }

        return {
            name: skillName,
            content,
            references
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
        formatted += '\n\n---\n## Reference Materials\n\n'
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
    return skills.map(s => formatSkillForPrompt(s, includeReferences)).join('\n\n---\n\n')
}

/**
 * List available skills
 */
export async function listAvailableSkills(): Promise<string[]> {
    const skillsPath = path.join(process.cwd(), 'skills')

    try {
        const entries = await fs.readdir(skillsPath, { withFileTypes: true })
        return entries
            .filter(e => e.isDirectory())
            .map(e => e.name)
    } catch {
        return []
    }
}

/**
 * Get skill metadata
 */
export async function getSkillMetadata(skillName: string): Promise<{
    exists: boolean
    hasReferences: boolean
    referenceCount: number
} | null> {
    const skillPath = path.join(process.cwd(), 'skills', skillName)

    try {
        await fs.access(path.join(skillPath, 'SKILL.md'))

        let referenceCount = 0
        try {
            const refs = await fs.readdir(path.join(skillPath, 'references'))
            referenceCount = refs.filter(r => r.endsWith('.md')).length
        } catch {
            // No references
        }

        return {
            exists: true,
            hasReferences: referenceCount > 0,
            referenceCount
        }
    } catch {
        return null
    }
}
