/**
 * Storyteller Workspace - Mastra-style Workspace Configuration
 *
 * Manages script artifacts, world bible content, and episode files.
 * Provides:
 * - File system operations for script storage
 * - Content indexing for search
 * - Artifact versioning
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { FileEncoding } from '@/shared/data/constants/protocol'
import {
  STORYTELLER_WORKSPACE_ALL_DIRS,
  STORYTELLER_WORKSPACE_AUTO_INDEX_DIRS,
  StorytellerArtifactType,
  StorytellerArtifactTypeValue,
  StorytellerWorkspaceDefault,
  StorytellerWorkspaceDir,
  StorytellerWorkspaceFileExt,
} from './constants/storyteller-workspace'
import { scriptArtifactFromJson } from './script-artifact-wire'

// Workspace configuration
export interface WorkspaceConfig {
  basePath: string
  indexingEnabled: boolean
  autoIndexPaths: string[]
}

// Script artifact types
export interface ScriptArtifact {
  id: string
  type: StorytellerArtifactTypeValue
  name: string
  content: string
  metadata: {
    projectId: string
    episodeId?: string
    version: number
    createdAt: Date
    updatedAt: Date
    author?: string
  }
}

// File index entry for search
export interface FileIndexEntry {
  path: string
  type: string
  name: string
  lastModified: Date
  size: number
  contentPreview?: string
}

/**
 * Storyteller Workspace
 *
 * Provides file-based storage for storyteller artifacts.
 */
export class StorytellerWorkspace {
  private config: WorkspaceConfig
  private fileIndex: Map<string, FileIndexEntry> = new Map()

  constructor(config?: Partial<WorkspaceConfig>) {
    this.config = {
      basePath: config?.basePath || StorytellerWorkspaceDefault.BasePath,
      indexingEnabled: config?.indexingEnabled ?? true,
      autoIndexPaths: config?.autoIndexPaths || [...STORYTELLER_WORKSPACE_AUTO_INDEX_DIRS],
    }
  }

  /**
   * Initialize the workspace (create directories)
   */
  async initialize(): Promise<void> {
    const directories = [
      this.config.basePath,
      path.join(this.config.basePath, StorytellerWorkspaceDir.Scripts),
      path.join(this.config.basePath, StorytellerWorkspaceDir.WorldBible),
      path.join(this.config.basePath, StorytellerWorkspaceDir.Episodes),
      path.join(this.config.basePath, StorytellerWorkspaceDir.Characters),
      path.join(this.config.basePath, StorytellerWorkspaceDir.Outlines),
    ]

    for (const dir of directories) {
      await fs.mkdir(dir, { recursive: true })
    }

    if (this.config.indexingEnabled) {
      await this.rebuildIndex()
    }
  }

  /**
   * Save a script artifact
   */
  async saveScript(
    artifact: Omit<ScriptArtifact, 'id' | 'metadata'> & {
      projectId: string
      episodeId?: string
    }
  ): Promise<ScriptArtifact> {
    const id = uuidv4()
    const now = new Date()

    const fullArtifact: ScriptArtifact = {
      id,
      type: artifact.type,
      name: artifact.name,
      content: artifact.content,
      metadata: {
        projectId: artifact.projectId,
        episodeId: artifact.episodeId,
        version: 1,
        createdAt: now,
        updatedAt: now,
      },
    }

    // Determine file path based on type
    const subDir = this.getSubdirectory(artifact.type)
    const fileName = `${artifact.name.replace(/[^a-zA-Z0-9-_]/g, '_')}-${id.slice(0, 8)}${StorytellerWorkspaceFileExt.Json}`
    const filePath = path.join(this.config.basePath, subDir, fileName)

    await fs.writeFile(filePath, JSON.stringify(fullArtifact, null, 2), FileEncoding.Utf8)

    // Update index
    if (this.config.indexingEnabled) {
      this.fileIndex.set(filePath, {
        path: filePath,
        type: artifact.type,
        name: artifact.name,
        lastModified: now,
        size: artifact.content.length,
        contentPreview: artifact.content.slice(0, 200),
      })
    }

    return fullArtifact
  }

  /**
   * Load a script artifact by ID
   */
  async loadScript(id: string): Promise<ScriptArtifact | null> {
    // Search through all subdirectories
    for (const subDir of STORYTELLER_WORKSPACE_ALL_DIRS) {
      const dirPath = path.join(this.config.basePath, subDir)
      try {
        const files = await fs.readdir(dirPath)
        for (const file of files) {
          if (file.includes(id.slice(0, 8))) {
            const filePath = path.join(dirPath, file)
            const content = await fs.readFile(filePath, FileEncoding.Utf8)
            return scriptArtifactFromJson(content)
          }
        }
      } catch {
        // Directory doesn't exist, skip
      }
    }
    return null
  }

  /**
   * List all scripts for a project
   */
  async listScripts(projectId: string, type?: ScriptArtifact['type']): Promise<ScriptArtifact[]> {
    const results: ScriptArtifact[] = []
    const searchDirs = type ? [this.getSubdirectory(type)] : STORYTELLER_WORKSPACE_ALL_DIRS

    for (const subDir of searchDirs) {
      const dirPath = path.join(this.config.basePath, subDir)
      try {
        const files = await fs.readdir(dirPath)
        for (const file of files) {
          if (file.endsWith(StorytellerWorkspaceFileExt.Json)) {
            const filePath = path.join(dirPath, file)
            const content = await fs.readFile(filePath, FileEncoding.Utf8)
            const artifact = scriptArtifactFromJson(content)
            if (artifact && artifact.metadata.projectId === projectId) {
              results.push(artifact)
            }
          }
        }
      } catch {
        // Directory doesn't exist, skip
      }
    }

    return results.sort(
      (a, b) => new Date(b.metadata.updatedAt).getTime() - new Date(a.metadata.updatedAt).getTime()
    )
  }

  /**
   * Update an existing script
   */
  async updateScript(
    id: string,
    updates: Partial<Pick<ScriptArtifact, 'name' | 'content'>>
  ): Promise<ScriptArtifact | null> {
    const existing = await this.loadScript(id)
    if (!existing) return null

    const updated: ScriptArtifact = {
      ...existing,
      name: updates.name ?? existing.name,
      content: updates.content ?? existing.content,
      metadata: {
        ...existing.metadata,
        version: existing.metadata.version + 1,
        updatedAt: new Date(),
      },
    }

    // Find and update the file
    const subDir = this.getSubdirectory(existing.type)
    const dirPath = path.join(this.config.basePath, subDir)
    const files = await fs.readdir(dirPath)

    for (const file of files) {
      if (file.includes(id.slice(0, 8))) {
        const filePath = path.join(dirPath, file)
        await fs.writeFile(filePath, JSON.stringify(updated, null, 2), FileEncoding.Utf8)
        return updated
      }
    }

    return null
  }

  /**
   * Delete a script
   */
  async deleteScript(id: string): Promise<boolean> {
    for (const subDir of STORYTELLER_WORKSPACE_ALL_DIRS) {
      const dirPath = path.join(this.config.basePath, subDir)
      try {
        const files = await fs.readdir(dirPath)
        for (const file of files) {
          if (file.includes(id.slice(0, 8))) {
            const filePath = path.join(dirPath, file)
            await fs.unlink(filePath)
            this.fileIndex.delete(filePath)
            return true
          }
        }
      } catch {
        // Directory doesn't exist, skip
      }
    }
    return false
  }

  /**
   * Search scripts by content
   */
  async searchScripts(query: string, projectId?: string): Promise<ScriptArtifact[]> {
    const allScripts = projectId ? await this.listScripts(projectId) : await this.getAllScripts()

    const queryLower = query.toLowerCase()

    return allScripts.filter(
      script =>
        script.name.toLowerCase().includes(queryLower) ||
        script.content.toLowerCase().includes(queryLower)
    )
  }

  /**
   * Get all scripts across all projects
   */
  private async getAllScripts(): Promise<ScriptArtifact[]> {
    const results: ScriptArtifact[] = []

    for (const subDir of STORYTELLER_WORKSPACE_ALL_DIRS) {
      const dirPath = path.join(this.config.basePath, subDir)
      try {
        const files = await fs.readdir(dirPath)
        for (const file of files) {
          if (file.endsWith(StorytellerWorkspaceFileExt.Json)) {
            const filePath = path.join(dirPath, file)
            const content = await fs.readFile(filePath, FileEncoding.Utf8)
            const artifact = scriptArtifactFromJson(content)
            if (artifact) results.push(artifact)
          }
        }
      } catch {
        // Directory doesn't exist, skip
      }
    }

    return results
  }

  /**
   * Rebuild the file index
   */
  async rebuildIndex(): Promise<void> {
    this.fileIndex.clear()

    for (const subDir of this.config.autoIndexPaths) {
      const dirPath = path.join(this.config.basePath, subDir)
      try {
        const files = await fs.readdir(dirPath)
        for (const file of files) {
          if (file.endsWith(StorytellerWorkspaceFileExt.Json)) {
            const filePath = path.join(dirPath, file)
            const stats = await fs.stat(filePath)
            const content = await fs.readFile(filePath, FileEncoding.Utf8)
            const parsed = scriptArtifactFromJson(content)
            if (!parsed) continue

            this.fileIndex.set(filePath, {
              path: filePath,
              type: parsed.type,
              name: parsed.name,
              lastModified: stats.mtime,
              size: stats.size,
              contentPreview: parsed.content.slice(0, 200),
            })
          }
        }
      } catch {
        // Directory doesn't exist, skip
      }
    }
  }

  /**
   * Get subdirectory for artifact type
   */
  private getSubdirectory(type: ScriptArtifact['type']): string {
    switch (type) {
      case StorytellerArtifactType.Script:
        return StorytellerWorkspaceDir.Scripts
      case StorytellerArtifactType.Outline:
        return StorytellerWorkspaceDir.Outlines
      case StorytellerArtifactType.BeatBoard:
        return StorytellerWorkspaceDir.Scripts
      case StorytellerArtifactType.CharacterSheet:
        return StorytellerWorkspaceDir.Characters
      case StorytellerArtifactType.WorldBible:
        return StorytellerWorkspaceDir.WorldBible
      default:
        return StorytellerWorkspaceDir.Scripts
    }
  }

  /**
   * Get workspace stats
   */
  async getStats(): Promise<{
    totalScripts: number
    byType: Record<string, number>
    totalSize: number
  }> {
    const allScripts = await this.getAllScripts()

    const byType: Record<string, number> = {}
    let totalSize = 0

    for (const script of allScripts) {
      byType[script.type] = (byType[script.type] || 0) + 1
      totalSize += script.content.length
    }

    return {
      totalScripts: allScripts.length,
      byType,
      totalSize,
    }
  }
}

// Singleton instance
let workspaceInstance: StorytellerWorkspace | null = null

export function getStorytellerWorkspace(): StorytellerWorkspace {
  if (!workspaceInstance) {
    workspaceInstance = new StorytellerWorkspace()
  }
  return workspaceInstance
}

export async function initializeWorkspace(): Promise<StorytellerWorkspace> {
  const workspace = getStorytellerWorkspace()
  await workspace.initialize()
  return workspace
}
