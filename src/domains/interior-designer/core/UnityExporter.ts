import JSZip from 'jszip'
import { InteriorState } from '../state/useInteriorStore'
import { UnityYAML } from './UnityYAML'
import * as THREE from 'three'
import {
  JsZipOutputType,
  ThreeEulerOrder,
  UNITY_DATA_URL_PREFIX,
  UNITY_DEFAULT_MODEL_EXTENSION,
  UNITY_EXPORT_README,
  UNITY_PRIMITIVE_MODEL_URLS,
  UnityAssetExtension,
  UnityExportFile,
  UnityExportFolder,
  UnityModelFilePrefix,
} from '@/domains/interior-designer/constants/unity-export'
import { UrlScheme } from '@/shared/data/constants/protocol'

// ------------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------------

async function fetchAsset(url: string, useProxy: boolean = true): Promise<Blob | null> {
  if (!url) return null
  if (url.startsWith(UNITY_DATA_URL_PREFIX)) return null
  if ((UNITY_PRIMITIVE_MODEL_URLS as readonly string[]).includes(url)) return null

  let fetchUrl = url
  if (
    useProxy &&
    (url.startsWith(UrlScheme.Http) || url.startsWith(UrlScheme.Https))
  ) {
    fetchUrl = `/api/proxy-model?url=${encodeURIComponent(url)}`
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

function normalizeFileName(id: string, url: string, prefix: string): string {
  const ext = getExtension(url)
  return `${prefix}_${id}.${ext}`
}

// ------------------------------------------------------------------
// EXPORT LOGIC
// ------------------------------------------------------------------

export const UnityExporter = {
  prepareExport: async (state: Pick<InteriorState, 'walls' | 'objects'>) => {
    const zip = new JSZip()

    const rootFolder = zip.folder(UnityExportFolder.Assets)?.folder(UnityExportFolder.InteriorDesign)
    const modelsFolder = rootFolder?.folder(UnityExportFolder.Models)
    void rootFolder?.folder(UnityExportFolder.Textures)

    const modelGuids = new Map<string, string>()

    for (const o of state.objects) {
      if (o.modelUrl && !(UNITY_PRIMITIVE_MODEL_URLS as readonly string[]).includes(o.modelUrl)) {
        if (!modelGuids.has(o.modelUrl)) {
          const blob = await fetchAsset(o.modelUrl)
          if (blob) {
            const guid = UnityYAML.generateGUID()
            const fileName = normalizeFileName(
              o.id.substring(0, 8),
              o.modelUrl,
              UnityModelFilePrefix.Model
            )

            modelsFolder?.file(fileName, blob)
            modelsFolder?.file(`${fileName}.meta`, UnityYAML.generateMeta(guid))

            modelGuids.set(o.modelUrl, guid)
          }
        }
      }
    }

    let sceneYaml = UnityYAML.generateSceneHeader()
    let fileIdCounter = 100

    for (const w of state.walls) {
      const goId = fileIdCounter++
      const transId = fileIdCounter++
      const meshId = fileIdCounter++
      const rendId = fileIdCounter++

      const start = new THREE.Vector3(w.start[0], w.start[1], w.start[2])
      const end = new THREE.Vector3(w.end[0], w.end[1], w.end[2])
      const center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
      center.y += w.height / 2

      const length = start.distanceTo(end)
      const angle = Math.atan2(end.x - start.x, end.z - start.z)

      const quat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle)

      sceneYaml += UnityYAML.gameObject(goId, `Wall_${w.id.substring(0, 6)}`, [
        { type: 4, id: transId },
        { type: 33, id: meshId },
        { type: 23, id: rendId },
      ])

      sceneYaml += UnityYAML.transform(
        transId,
        goId,
        { x: center.x, y: center.y, z: center.z },
        { x: quat.x, y: quat.y, z: quat.z, w: quat.w },
        { x: w.thickness, y: w.height, z: length }
      )

      sceneYaml += UnityYAML.cubeMeshFilter(meshId, goId)
      sceneYaml += UnityYAML.meshRenderer(rendId, goId)
    }

    for (const o of state.objects) {
      const guid = modelGuids.get(o.modelUrl)
      if (guid) {
        const instanceId = fileIdCounter++

        const euler = new THREE.Euler(
          o.rotation[0],
          o.rotation[1],
          o.rotation[2],
          ThreeEulerOrder.Xyz
        )
        const quat = new THREE.Quaternion().setFromEuler(euler)

        sceneYaml += UnityYAML.prefabInstance(
          instanceId,
          guid,
          { x: o.position[0], y: o.position[1], z: o.position[2] },
          { x: quat.x, y: quat.y, z: quat.z, w: quat.w },
          { x: o.scale[0], y: o.scale[1], z: o.scale[2] }
        )
      }
    }

    rootFolder?.file(UnityExportFile.InteriorScene, sceneYaml)
    rootFolder?.file(UnityExportFile.Readme, UNITY_EXPORT_README)

    return zip
  },

  createExportZip: async (state: Pick<InteriorState, 'walls' | 'objects'>): Promise<Blob> => {
    const zip = await UnityExporter.prepareExport(state)
    return await zip.generateAsync({ type: JsZipOutputType.Blob })
  },
}
