import JSZip from 'jszip'
import { InteriorState } from '../state/useInteriorStore'
import { UnityYAML } from './unity-yaml'
import { buildUrl } from '@/shared/data/url-builder'
import { ApiRoutePath, UrlScheme } from '@/shared/data/constants/protocol'
import {
  JsZipOutputType,
  UNITY_DATA_URL_PREFIX,
  UNITY_DEFAULT_MODEL_EXTENSION,
  UNITY_EXPORT_README,
  UnityAssetExtension,
  UnityExportFile,
  UnityExportFolder,
  UnityModelFilePrefix,
  isUnityPrimitiveModelUrl,
} from '@/domains/interior-designer/constants/unity-export'
import {
  appendObjectsToSceneYaml,
  appendWallsToSceneYaml,
  normalizeExportFileName,
} from './unity-export-scene'

async function fetchAsset(url: string, useProxy: boolean = true): Promise<Blob | null> {
  if (!url) return null
  if (url.startsWith(UNITY_DATA_URL_PREFIX)) return null
  if (isUnityPrimitiveModelUrl(url)) return null

  let fetchUrl = url
  if (useProxy && (url.startsWith(UrlScheme.Http) || url.startsWith(UrlScheme.Https))) {
    fetchUrl = buildUrl(ApiRoutePath.ProxyModel, { url })
  }

  try {
    const res = await fetch(fetchUrl)
    if (!res.ok) throw new Error(`Failed to fetch ${url}`)
    return await res.blob()
  } catch (e) {
    console.warn(`[UnityExporter] Failed to fetch asset: ${url}`, e)
    return null
  }
}

function getExtension(url: string): string {
  const cleanUrl = url.split('?')[0]
  const ext = cleanUrl.split('.').pop()
  if (
    ext &&
    (ext.toLowerCase() === UnityAssetExtension.Glb ||
      ext.toLowerCase() === UnityAssetExtension.Gltf ||
      ext.toLowerCase() === UnityAssetExtension.Png ||
      ext.toLowerCase() === UnityAssetExtension.Jpg)
  ) {
    return ext.toLowerCase()
  }
  return UNITY_DEFAULT_MODEL_EXTENSION
}

async function collectModelAssets(
  objects: InteriorState['objects'],
  modelsFolder: JSZip | null | undefined,
): Promise<Map<string, string>> {
  const modelGuids = new Map<string, string>()

  for (const o of objects) {
    if (!o.modelUrl || isUnityPrimitiveModelUrl(o.modelUrl) || modelGuids.has(o.modelUrl)) {
      continue
    }

    const blob = await fetchAsset(o.modelUrl)
    if (!blob) continue

    const guid = UnityYAML.generateGUID()
    const fileName = normalizeExportFileName(
      o.id.substring(0, 8),
      o.modelUrl,
      UnityModelFilePrefix.Model,
      getExtension(o.modelUrl),
    )

    modelsFolder?.file(fileName, blob)
    modelsFolder?.file(`${fileName}.meta`, UnityYAML.generateMeta(guid))
    modelGuids.set(o.modelUrl, guid)
  }

  return modelGuids
}

export const UnityExporter = {
  prepareExport: async (state: Pick<InteriorState, 'walls' | 'objects'>) => {
    const zip = new JSZip()

    const rootFolder = zip.folder(UnityExportFolder.Assets)?.folder(UnityExportFolder.InteriorDesign)
    const modelsFolder = rootFolder?.folder(UnityExportFolder.Models)
    void rootFolder?.folder(UnityExportFolder.Textures)

    const modelGuids = await collectModelAssets(state.objects, modelsFolder)

    let sceneYaml = UnityYAML.generateSceneHeader()
    const wallsResult = appendWallsToSceneYaml(state, 100)
    sceneYaml += wallsResult.sceneYaml

    const objectsResult = appendObjectsToSceneYaml(state, modelGuids, wallsResult.nextId)
    sceneYaml += objectsResult.sceneYaml

    rootFolder?.file(UnityExportFile.InteriorScene, sceneYaml)
    rootFolder?.file(UnityExportFile.Readme, UNITY_EXPORT_README)

    return zip
  },

  createExportZip: async (state: Pick<InteriorState, 'walls' | 'objects'>): Promise<Blob> => {
    const zip = await UnityExporter.prepareExport(state)
    return await zip.generateAsync({ type: JsZipOutputType.Blob })
  },
}
