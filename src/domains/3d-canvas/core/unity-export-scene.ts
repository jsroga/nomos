import * as THREE from 'three'
import { UnityYAML } from './unity-yaml'
import type { InteriorState } from '../state/useInteriorStore'
import { ThreeEulerOrder } from '@/domains/3d-canvas/constants/unity-export'

type ExportState = Pick<InteriorState, 'walls' | 'objects'>

export function appendWallsToSceneYaml(
  state: ExportState,
  startId: number,
): { sceneYaml: string; nextId: number } {
  let sceneYaml = ''
  let fileIdCounter = startId

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
      { x: w.thickness, y: w.height, z: length },
    )

    sceneYaml += UnityYAML.cubeMeshFilter(meshId, goId)
    sceneYaml += UnityYAML.meshRenderer(rendId, goId)
  }

  return { sceneYaml, nextId: fileIdCounter }
}

export function appendObjectsToSceneYaml(
  state: ExportState,
  modelGuids: Map<string, string>,
  startId: number,
): { sceneYaml: string; nextId: number } {
  let sceneYaml = ''
  let fileIdCounter = startId

  for (const o of state.objects) {
    const guid = modelGuids.get(o.modelUrl)
    if (!guid) continue

    const instanceId = fileIdCounter++
    const euler = new THREE.Euler(
      o.rotation[0],
      o.rotation[1],
      o.rotation[2],
      ThreeEulerOrder.Xyz,
    )
    const quat = new THREE.Quaternion().setFromEuler(euler)

    sceneYaml += UnityYAML.prefabInstance(
      instanceId,
      guid,
      { x: o.position[0], y: o.position[1], z: o.position[2] },
      { x: quat.x, y: quat.y, z: quat.z, w: quat.w },
      { x: o.scale[0], y: o.scale[1], z: o.scale[2] },
    )
  }

  return { sceneYaml, nextId: fileIdCounter }
}

export function normalizeExportFileName(
  id: string,
  url: string,
  prefix: string,
  extension: string,
): string {
  void url
  return `${prefix}_${id}.${extension}`
}
