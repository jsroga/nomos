import { readString, recordFromJson } from '@/shared/data/json-guards'
import type { Surface, SurfaceType, Wall } from '../state/useInteriorStore'
import { vec3FromArray } from './vec3'

const SURFACE_TYPES = new Set<string>([
  'grass',
  'water',
  'road',
  'dirt',
  'pavement',
  'mars',
  'sand',
  'rock',
  'wall',
])

function parseSurfaceType(value: unknown): SurfaceType {
  const raw = readString(value)
  if (raw && SURFACE_TYPES.has(raw)) {
    for (const entry of SURFACE_TYPES) {
      if (entry === raw) return entry
    }
  }
  return 'grass'
}

function vec3ArrayFromJson(value: unknown): [number, number, number][] {
  if (!Array.isArray(value)) return []
  return value
    .filter((point): point is number[] => Array.isArray(point))
    .map(point => vec3FromArray(point))
}

export function wallFromJson(value: unknown): Wall | null {
  const record = recordFromJson(value)
  const id = readString(record.id)
  if (!id) return null
  return {
    id,
    start: vec3FromArray(Array.isArray(record.start) ? record.start : []),
    end: vec3FromArray(Array.isArray(record.end) ? record.end : []),
    height: typeof record.height === 'number' ? record.height : 3,
    thickness: typeof record.thickness === 'number' ? record.thickness : 0.2,
    texture: readString(record.texture),
    level: typeof record.level === 'number' ? record.level : undefined,
  }
}

export function surfaceFromJson(value: unknown): Surface | null {
  const record = recordFromJson(value)
  const id = readString(record.id)
  if (!id) return null
  return {
    id,
    type: parseSurfaceType(record.type),
    points: vec3ArrayFromJson(record.points),
    isPath: record.isPath === true,
    curved: record.curved === true,
    width: typeof record.width === 'number' ? record.width : undefined,
    layerIndex: typeof record.layerIndex === 'number' ? record.layerIndex : 0,
    texture: readString(record.texture),
    textureScale: typeof record.textureScale === 'number' ? record.textureScale : undefined,
    roughness: typeof record.roughness === 'number' ? record.roughness : undefined,
    metalness: typeof record.metalness === 'number' ? record.metalness : undefined,
    roundness: typeof record.roundness === 'number' ? record.roundness : undefined,
    height: typeof record.height === 'number' ? record.height : undefined,
    isVertical: record.isVertical === true ? true : undefined,
    rotation: Array.isArray(record.rotation) ? vec3FromArray(record.rotation) : undefined,
    level: typeof record.level === 'number' ? record.level : undefined,
  }
}
