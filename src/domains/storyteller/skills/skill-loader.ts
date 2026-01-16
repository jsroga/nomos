/**
 * Skills Loader
 *
 * Loads specialized knowledge on-demand for agents.
 * Part of the Skills pattern from LangChain multi-agent architecture.
 *
 * Benefits:
 * - Reduces token usage (only load what's needed)
 * - Modular knowledge management
 * - Easy to update and extend
 */

export interface Skill {
  id: string
  name: string
  description: string
  content: string
  tokens: number
  category: string
  tags: string[]
}

export interface LoadedSkill extends Skill {
  loadedAt: number
}

/**
 * Skills Loader manages loading and unloading of specialist knowledge
 */
export class SkillLoader {
  private skills: Map<string, Skill> = new Map()
  private loadedSkills: Map<string, LoadedSkill> = new Map()
  private maxLoadedTokens: number

  constructor(maxTokens: number = 4000) {
    this.maxLoadedTokens = maxTokens
  }

  /**
   * Register a skill
   */
  registerSkill(skill: Skill): void {
    this.skills.set(skill.id, skill)
  }

  /**
   * Register multiple skills
   */
  registerSkills(skills: Skill[]): void {
    skills.forEach(skill => this.registerSkill(skill))
  }

  /**
   * Load a skill by ID
   */
  async loadSkill(skillId: string): Promise<string> {
    const skill = this.skills.get(skillId)

    if (!skill) {
      throw new Error(`Skill "${skillId}" not found`)
    }

    // Check if already loaded
    if (this.loadedSkills.has(skillId)) {
      console.log(`[Skills] Skill "${skill.name}" already loaded`)
      return skill.content
    }

    // Check token limit
    const currentTokens = this.getTotalLoadedTokens()
    if (currentTokens + skill.tokens > this.maxLoadedTokens) {
      // Unload oldest skills to make room
      this.unloadOldestSkills(skill.tokens)
    }

    // Load the skill
    this.loadedSkills.set(skillId, {
      ...skill,
      loadedAt: Date.now(),
    })

    console.log(`[Skills] Loaded "${skill.name}" (${skill.tokens} tokens)`)

    return skill.content
  }

  /**
   * Load multiple skills
   */
  async loadSkills(skillIds: string[]): Promise<string> {
    const contents: string[] = []

    for (const id of skillIds) {
      try {
        const content = await this.loadSkill(id)
        contents.push(content)
      } catch (error) {
        console.error(`[Skills] Failed to load skill "${id}":`, error)
      }
    }

    return contents.join('\n\n')
  }

  /**
   * Unload a skill
   */
  unloadSkill(skillId: string): void {
    const skill = this.loadedSkills.get(skillId)
    if (skill) {
      this.loadedSkills.delete(skillId)
      console.log(`[Skills] Unloaded "${skill.name}"`)
    }
  }

  /**
   * Unload oldest skills to free up tokens
   */
  private unloadOldestSkills(tokensNeeded: number): void {
    const sorted = Array.from(this.loadedSkills.values()).sort((a, b) => a.loadedAt - b.loadedAt)

    let freedTokens = 0

    for (const skill of sorted) {
      if (freedTokens >= tokensNeeded) break

      this.unloadSkill(skill.id)
      freedTokens += skill.tokens
    }
  }

  /**
   * Get all loaded skills as formatted context
   */
  getLoadedContext(): string {
    if (this.loadedSkills.size === 0) {
      return ''
    }

    const loaded = Array.from(this.loadedSkills.values())
      .map(skill => {
        return `## ${skill.name}\n\n${skill.content}`
      })
      .join('\n\n---\n\n')

    return `# Specialist Knowledge\n\n${loaded}`
  }

  /**
   * Get list of loaded skill IDs
   */
  getLoadedSkillIds(): string[] {
    return Array.from(this.loadedSkills.keys())
  }

  /**
   * Get list of loaded skill names
   */
  getLoadedSkillNames(): string[] {
    return Array.from(this.loadedSkills.values()).map(s => s.name)
  }

  /**
   * Get total tokens of loaded skills
   */
  getTotalLoadedTokens(): number {
    return Array.from(this.loadedSkills.values()).reduce((sum, skill) => sum + skill.tokens, 0)
  }

  /**
   * Check if a skill is loaded
   */
  isLoaded(skillId: string): boolean {
    return this.loadedSkills.has(skillId)
  }

  /**
   * Get all available skill IDs
   */
  getAvailableSkillIds(): string[] {
    return Array.from(this.skills.keys())
  }

  /**
   * Get all available skills
   */
  getAvailableSkills(): Skill[] {
    return Array.from(this.skills.values())
  }

  /**
   * Find skills by category
   */
  getSkillsByCategory(category: string): Skill[] {
    return Array.from(this.skills.values()).filter(skill => skill.category === category)
  }

  /**
   * Find skills by tag
   */
  getSkillsByTag(tag: string): Skill[] {
    return Array.from(this.skills.values()).filter(skill => skill.tags.includes(tag))
  }

  /**
   * Clear all loaded skills
   */
  clearLoaded(): void {
    this.loadedSkills.clear()
    console.log('[Skills] All skills unloaded')
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      totalSkills: this.skills.size,
      loadedSkills: this.loadedSkills.size,
      loadedTokens: this.getTotalLoadedTokens(),
      maxTokens: this.maxLoadedTokens,
      utilizationPercent: Math.round((this.getTotalLoadedTokens() / this.maxLoadedTokens) * 100),
    }
  }
}

/**
 * Global skill loader instance
 */
let globalSkillLoader: SkillLoader | null = null

/**
 * Get the global skill loader
 */
export function getSkillLoader(): SkillLoader {
  if (!globalSkillLoader) {
    globalSkillLoader = new SkillLoader()
  }
  return globalSkillLoader
}

/**
 * Reset the global skill loader (useful for testing)
 */
export function resetSkillLoader(): void {
  globalSkillLoader = null
}
