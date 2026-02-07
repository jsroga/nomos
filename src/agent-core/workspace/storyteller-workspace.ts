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

// Workspace configuration
export interface WorkspaceConfig {
    basePath: string
    indexingEnabled: boolean
    autoIndexPaths: string[]
}

// Script artifact types
export interface ScriptArtifact {
    id: string
    type: 'script' | 'outline' | 'beat-board' | 'character-sheet' | 'world-bible'
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
            basePath: config?.basePath || './workspace/storyteller',
            indexingEnabled: config?.indexingEnabled ?? true,
            autoIndexPaths: config?.autoIndexPaths || [
                'scripts',
                'world-bible',
                'episodes',
            ]
        }
    }

    /**
     * Initialize the workspace (create directories)
     */
    async initialize(): Promise<void> {
        const directories = [
            this.config.basePath,
            path.join(this.config.basePath, 'scripts'),
            path.join(this.config.basePath, 'world-bible'),
            path.join(this.config.basePath, 'episodes'),
            path.join(this.config.basePath, 'characters'),
            path.join(this.config.basePath, 'outlines'),
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
    async saveScript(artifact: Omit<ScriptArtifact, 'id' | 'metadata'> & {
        projectId: string
        episodeId?: string
    }): Promise<ScriptArtifact> {
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
            }
        }

        // Determine file path based on type
        const subDir = this.getSubdirectory(artifact.type)
        const fileName = `${artifact.name.replace(/[^a-zA-Z0-9-_]/g, '_')}-${id.slice(0, 8)}.json`
        const filePath = path.join(this.config.basePath, subDir, fileName)

        await fs.writeFile(filePath, JSON.stringify(fullArtifact, null, 2), 'utf-8')

        // Update index
        if (this.config.indexingEnabled) {
            this.fileIndex.set(filePath, {
                path: filePath,
                type: artifact.type,
                name: artifact.name,
                lastModified: now,
                size: artifact.content.length,
                contentPreview: artifact.content.slice(0, 200)
            })
        }

        return fullArtifact
    }

    /**
     * Load a script artifact by ID
     */
    async loadScript(id: string): Promise<ScriptArtifact | null> {
        // Search through all subdirectories
        for (const subDir of ['scripts', 'world-bible', 'episodes', 'characters', 'outlines']) {
            const dirPath = path.join(this.config.basePath, subDir)
            try {
                const files = await fs.readdir(dirPath)
                for (const file of files) {
                    if (file.includes(id.slice(0, 8))) {
                        const filePath = path.join(dirPath, file)
                        const content = await fs.readFile(filePath, 'utf-8')
                        return JSON.parse(content) as ScriptArtifact
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
        const searchDirs = type ? [this.getSubdirectory(type)] : ['scripts', 'world-bible', 'episodes', 'characters', 'outlines']

        for (const subDir of searchDirs) {
            const dirPath = path.join(this.config.basePath, subDir)
            try {
                const files = await fs.readdir(dirPath)
                for (const file of files) {
                    if (file.endsWith('.json')) {
                        const filePath = path.join(dirPath, file)
                        const content = await fs.readFile(filePath, 'utf-8')
                        const artifact = JSON.parse(content) as ScriptArtifact
                        if (artifact.metadata.projectId === projectId) {
                            results.push(artifact)
                        }
                    }
                }
            } catch {
                // Directory doesn't exist, skip
            }
        }

        return results.sort((a, b) =>
            new Date(b.metadata.updatedAt).getTime() - new Date(a.metadata.updatedAt).getTime()
        )
    }

    /**
     * Update an existing script
     */
    async updateScript(id: string, updates: Partial<Pick<ScriptArtifact, 'name' | 'content'>>): Promise<ScriptArtifact | null> {
        const existing = await this.loadScript(id)
        if (!existing) return null

        const updated: ScriptArtifact = {
            ...existing,
            name: updates.name ?? existing.name,
            content: updates.content ?? existing.content,
            metadata: {
                ...existing.metadata,
                version: existing.metadata.version + 1,
                updatedAt: new Date()
            }
        }

        // Find and update the file
        const subDir = this.getSubdirectory(existing.type)
        const dirPath = path.join(this.config.basePath, subDir)
        const files = await fs.readdir(dirPath)

        for (const file of files) {
            if (file.includes(id.slice(0, 8))) {
                const filePath = path.join(dirPath, file)
                await fs.writeFile(filePath, JSON.stringify(updated, null, 2), 'utf-8')
                return updated
            }
        }

        return null
    }

    /**
     * Delete a script
     */
    async deleteScript(id: string): Promise<boolean> {
        for (const subDir of ['scripts', 'world-bible', 'episodes', 'characters', 'outlines']) {
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
        const allScripts = projectId
            ? await this.listScripts(projectId)
            : await this.getAllScripts()

        const queryLower = query.toLowerCase()

        return allScripts.filter(script =>
            script.name.toLowerCase().includes(queryLower) ||
            script.content.toLowerCase().includes(queryLower)
        )
    }

    /**
     * Get all scripts across all projects
     */
    private async getAllScripts(): Promise<ScriptArtifact[]> {
        const results: ScriptArtifact[] = []

        for (const subDir of ['scripts', 'world-bible', 'episodes', 'characters', 'outlines']) {
            const dirPath = path.join(this.config.basePath, subDir)
            try {
                const files = await fs.readdir(dirPath)
                for (const file of files) {
                    if (file.endsWith('.json')) {
                        const filePath = path.join(dirPath, file)
                        const content = await fs.readFile(filePath, 'utf-8')
                        results.push(JSON.parse(content) as ScriptArtifact)
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
                    if (file.endsWith('.json')) {
                        const filePath = path.join(dirPath, file)
                        const stats = await fs.stat(filePath)
                        const content = await fs.readFile(filePath, 'utf-8')
                        const parsed = JSON.parse(content) as ScriptArtifact

                        this.fileIndex.set(filePath, {
                            path: filePath,
                            type: parsed.type,
                            name: parsed.name,
                            lastModified: stats.mtime,
                            size: stats.size,
                            contentPreview: parsed.content.slice(0, 200)
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
            case 'script':
                return 'scripts'
            case 'outline':
                return 'outlines'
            case 'beat-board':
                return 'scripts'
            case 'character-sheet':
                return 'characters'
            case 'world-bible':
                return 'world-bible'
            default:
                return 'scripts'
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
            totalSize
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
