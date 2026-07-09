import { readString, recordFromJson } from '@/shared/data/json-guards'
import type { ScriptArtifact } from './storyteller-workspace'

export enum ScriptArtifactType {
  Script = 'script',
  Outline = 'outline',
  BeatBoard = 'beat-board',
  CharacterSheet = 'character-sheet',
  WorldBible = 'world-bible',
}

const SCRIPT_ARTIFACT_TYPE_VALUES = new Set<string>(Object.values(ScriptArtifactType))

function parseScriptArtifactType(value: unknown): ScriptArtifact['type'] | null {
  const raw = readString(value)
  if (raw && SCRIPT_ARTIFACT_TYPE_VALUES.has(raw)) {
    for (const entry of Object.values(ScriptArtifactType)) {
      if (entry === raw) return entry
    }
  }
  return null
}

function parseDate(value: unknown): Date {
  const raw = readString(value)
  if (raw) {
    const parsed = new Date(raw)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return new Date()
}

export function scriptArtifactFromJson(content: string): ScriptArtifact | null {
  try {
    const record = recordFromJson(JSON.parse(content))
    const id = readString(record.id)
    const type = parseScriptArtifactType(record.type)
    const name = readString(record.name)
    const artifactContent = readString(record.content)
    const metadata = recordFromJson(record.metadata)
    const projectId = readString(metadata.projectId)
    if (!id || !type || !name || artifactContent === undefined || !projectId) {
      return null
    }

    return {
      id,
      type,
      name,
      content: artifactContent,
      metadata: {
        projectId,
        episodeId: readString(metadata.episodeId),
        version: typeof metadata.version === 'number' ? metadata.version : 1,
        createdAt: parseDate(metadata.createdAt),
        updatedAt: parseDate(metadata.updatedAt),
        author: readString(metadata.author),
      },
    }
  } catch {
    return null
  }
}
