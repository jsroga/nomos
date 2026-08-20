import { describe, expect, it } from 'vitest'
import {
  meshyProgressPercent,
  MeshyTaskStatusValue,
  parseMeshyTaskResult,
} from '../meshy-task-types'

describe('parseMeshyTaskResult', () => {
  it('reads a documented flat retrieve payload', () => {
    const parsed = parseMeshyTaskResult({
      id: 'task-1',
      status: MeshyTaskStatusValue.InProgress,
      progress: 41,
      preceding_tasks: 0,
    })
    expect(parsed.status).toBe(MeshyTaskStatusValue.InProgress)
    expect(parsed.progress).toBe(41)
    expect(parsed.id).toBe('task-1')
  })

  it('unwraps progress from a nested result object when top-level has no status', () => {
    const parsed = parseMeshyTaskResult({
      result: {
        status: MeshyTaskStatusValue.InProgress,
        progress: 67,
        model_url: '',
        thumbnail_url: '',
      },
    })
    expect(parsed.status).toBe(MeshyTaskStatusValue.InProgress)
    expect(parsed.progress).toBe(67)
  })

  it('keeps top-level progress when a nested result object is also present', () => {
    const parsed = parseMeshyTaskResult({
      id: 'task-1',
      status: MeshyTaskStatusValue.Pending,
      progress: 0,
      result: {
        status: MeshyTaskStatusValue.InProgress,
        progress: 1,
      },
    })
    expect(parsed.status).toBe(MeshyTaskStatusValue.Pending)
    expect(parsed.progress).toBe(0)
  })

  it('does not treat a create-task id string as a nested payload', () => {
    const parsed = parseMeshyTaskResult({ result: '018a210d-8ba4-705c-b111-1f1776f7f578' })
    expect(parsed.status).toBe(MeshyTaskStatusValue.Pending)
    expect(parsed.progress).toBeUndefined()
  })
})

describe('meshyProgressPercent', () => {
  it('keeps 0-100 integers', () => {
    expect(meshyProgressPercent(41, MeshyTaskStatusValue.InProgress)).toBe(41)
  })

  it('treats a first IN_PROGRESS value of 1 as not started', () => {
    expect(meshyProgressPercent(1, MeshyTaskStatusValue.InProgress)).toBe(0)
  })

  it('maps SUCCEEDED progress 1 on a 0-1 scale to 100', () => {
    expect(meshyProgressPercent(1, MeshyTaskStatusValue.Succeeded)).toBe(100)
  })

  it('maps 0-1 fractions onto 0-100', () => {
    expect(meshyProgressPercent(0.37, MeshyTaskStatusValue.InProgress)).toBe(37)
  })
})
