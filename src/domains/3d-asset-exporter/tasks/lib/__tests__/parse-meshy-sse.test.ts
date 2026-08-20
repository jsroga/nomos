import { describe, expect, it } from 'vitest'
import {
  appendMeshySseChunk,
  MeshySseEventName,
  parseMeshySseFrame,
} from '../parse-meshy-sse'

describe('appendMeshySseChunk', () => {
  it('splits complete frames and keeps a partial tail', () => {
    const split = appendMeshySseChunk('event: message\ndata: {"progress":0', '}\n\nevent: message\n')
    expect(split.frames).toEqual(['event: message\ndata: {"progress":0}'])
    expect(split.rest).toBe('event: message\n')
  })
})

describe('parseMeshySseFrame', () => {
  it('parses a pending progress message', () => {
    const parsed = parseMeshySseFrame(
      'event: message\ndata: {"id":"task-1","progress":0,"status":"PENDING"}',
    )
    expect(parsed?.event).toBe(MeshySseEventName.Message)
    expect(parsed?.json).toEqual({
      id: 'task-1',
      progress: 0,
      status: 'PENDING',
    })
  })

  it('returns null for a frame without data', () => {
    expect(parseMeshySseFrame('event: message')).toBeNull()
  })
})
