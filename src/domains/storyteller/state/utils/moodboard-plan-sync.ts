import { UrlScheme } from '@/shared/data/constants/protocol'
import { parseSeriesBibleRecord } from '@/domains/storyteller/core/io/project-jsonb'
import { useWorkspaceProjectStore } from '@/shared/workspace/workspace-project-store'

export function stringListsEqual(
  left: readonly string[] | null | undefined,
  right: readonly string[],
): boolean {
  if (!left || left.length !== right.length) return false
  return left.every((item, index) => item === right[index])
}

export function nextMoodboardImages(
  current: readonly string[],
  incoming: readonly string[],
  promptIndex: number | undefined,
): string[] {
  if (promptIndex === undefined) return [...incoming]
  const first = incoming[0]
  if (first === undefined) return [...current]
  const updated = [...current]
  updated[promptIndex] = first
  return updated
}

export function applyMoodboardImagesToPlan<T extends { moodImages?: string[] | null }>(
  prev: T | null,
  incoming: readonly string[],
  promptIndex?: number,
): T | null {
  if (!prev) return prev
  const current = prev.moodImages ?? []
  const next = nextMoodboardImages(current, incoming, promptIndex)
  if (stringListsEqual(current, next)) return prev
  return { ...prev, moodImages: next }
}

export function resolvePrimaryMoodboardUrl(
  projectId: string,
  moodImages: readonly string[] | null | undefined,
  savedPrimary: string | null,
): string | null {
  if (savedPrimary === null) return null
  const primaryIdx = Number.parseInt(savedPrimary, 10)
  if (!Number.isFinite(primaryIdx)) return null
  const img = moodImages?.[primaryIdx]
  if (!img) return null
  if (img.startsWith(UrlScheme.Http)) return img
  return `/projects/${projectId}/${img}`
}

export function syncProjectMoodImages(moodImages: string[]): void {
  const latestProject = useWorkspaceProjectStore.getState().currentProject
  if (!latestProject) return
  useWorkspaceProjectStore.getState().setCurrentProject({
    ...latestProject,
    series_bible: {
      ...parseSeriesBibleRecord(latestProject.series_bible),
      moodImages,
    },
  })
}
