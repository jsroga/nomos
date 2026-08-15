import { UrlScheme } from '@/shared/data/constants/protocol'
import { settingsApi } from '../../core/io/settings.api'
import { useWorkspaceProjectStore } from '@/shared/workspace/workspace-project-store'

export function isPublicHttpUrl(url: string): boolean {
  return url.startsWith(`${UrlScheme.Https}:`) || url.startsWith(`${UrlScheme.Http}:`)
}

export function shouldPersistStyleAnchor(
  isFirstTile: boolean,
  existingAnchor: string | null | undefined
): boolean {
  return isFirstTile && !existingAnchor
}

export async function persistFirstTileStyleAnchor(
  isFirstTile: boolean,
  imageUrl: string | undefined
): Promise<void> {
  if (!imageUrl || !isPublicHttpUrl(imageUrl)) return
  const project = useWorkspaceProjectStore.getState().currentProject
  if (!project || !shouldPersistStyleAnchor(isFirstTile, project.styleAnchorUrl)) return
  await settingsApi.patchProjectStyle(project.id, { styleAnchorUrl: imageUrl })
  const latest = useWorkspaceProjectStore.getState().currentProject
  if (!latest || latest.id !== project.id) return
  useWorkspaceProjectStore.getState().setCurrentProject({
    ...latest,
    styleAnchorUrl: imageUrl,
  })
}
