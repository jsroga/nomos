import JSZip from 'jszip'
import { InteriorState } from '../store/useInteriorStore' // Ensure Interface is exported
import { UnityYAML } from './UnityYAML'
import * as THREE from 'three'

// ------------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------------

async function fetchAsset(url: string, useProxy: boolean = true): Promise<Blob | null> {
  if (!url) return null
  if (url.startsWith('data:')) return null
  if (url === 'cube' || url === 'sphere' || url === 'cylinder') return null

  let fetchUrl = url
  if (useProxy && (url.startsWith('http') || url.startsWith('https'))) {
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
  const cleanUrl = url.split('?')[0] // Remove query params
  const ext = cleanUrl.split('.').pop()
  if (
    ext &&
    (ext.toLowerCase() === 'glb' ||
      ext.toLowerCase() === 'gltf' ||
      ext.toLowerCase() === 'png' ||
      ext.toLowerCase() === 'jpg')
  ) {
    return ext.toLowerCase()
  }
  return 'glb'
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

    // Structure
    const rootFolder = zip.folder('Assets')?.folder('InteriorDesign')
    const modelsFolder = rootFolder?.folder('Models')
    const texturesFolder = rootFolder?.folder('Textures')
    // No "Scenes" subfolder necessary, lets put scene in root of ID

    // Track Asset GUIDs
    // Map<ModelUrl, GUID>
    const modelGuids = new Map<string, string>()

    // 1. Process Objects (Download Models & Generate Meta)
    for (const o of state.objects) {
      // Deduplicate downloads by URL
      if (o.modelUrl && !['cube', 'sphere', 'cylinder'].includes(o.modelUrl)) {
        if (!modelGuids.has(o.modelUrl)) {
          const blob = await fetchAsset(o.modelUrl)
          if (blob) {
            const guid = UnityYAML.generateGUID()
            const fileName = normalizeFileName(o.id.substring(0, 8), o.modelUrl, 'model')

            modelsFolder?.file(fileName, blob)
            modelsFolder?.file(`${fileName}.meta`, UnityYAML.generateMeta(guid))

            modelGuids.set(o.modelUrl, guid)
          }
        }
      }
    }

    // 2. Build Scene YAML
    let sceneYaml = UnityYAML.generateSceneHeader()
    let fileIdCounter = 100 // Start IDs here

    // WALLS
    for (const w of state.walls) {
      const goId = fileIdCounter++
      const transId = fileIdCounter++
      const meshId = fileIdCounter++
      const rendId = fileIdCounter++

      // Calculate Transform
      const start = new THREE.Vector3(w.start[0], w.start[1], w.start[2])
      const end = new THREE.Vector3(w.end[0], w.end[1], w.end[2])
      const center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
      center.y += w.height / 2

      const length = start.distanceTo(end)
      const angle = Math.atan2(end.x - start.x, end.z - start.z) // Y rotation

      // Unity Quaternion from Angle (Axis Y)
      const quat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle)

      sceneYaml += UnityYAML.gameObject(goId, `Wall_${w.id.substring(0, 6)}`, [
        { type: 4, id: transId }, // Transform
        { type: 33, id: meshId }, // MeshFilter
        { type: 23, id: rendId }, // MeshRenderer
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

    // OBJECTS
    for (const o of state.objects) {
      const guid = modelGuids.get(o.modelUrl)
      if (guid) {
        const instanceId = fileIdCounter++

        // Euler to Quat conversion for YAML
        const euler = new THREE.Euler(o.rotation[0], o.rotation[1], o.rotation[2], 'XYZ')
        const quat = new THREE.Quaternion().setFromEuler(euler)

        sceneYaml += UnityYAML.prefabInstance(
          instanceId,
          guid,
          { x: o.position[0], y: o.position[1], z: o.position[2] },
          { x: quat.x, y: quat.y, z: quat.z, w: quat.w }, // Now passing W correctly
          { x: o.scale[0], y: o.scale[1], z: o.scale[2] }
        )
      }
    }

    rootFolder?.file('InteriorScene.unity', sceneYaml)

    // Readme
    rootFolder?.file(
      'README.txt',
      `
Interior Designer Project Export
--------------------------------
1. Drag the 'Assets' folder from this Zip into your Unity Project root.
2. Open 'Assets/InteriorDesign/InteriorScene.unity'.
3. All models and walls should be placed correctly.
        `.trim()
    )

    return zip
  },

  createExportZip: async (state: Pick<InteriorState, 'walls' | 'objects'>): Promise<Blob> => {
    const zip = await UnityExporter.prepareExport(state)
    return await zip.generateAsync({ type: 'blob' })
  },
}
