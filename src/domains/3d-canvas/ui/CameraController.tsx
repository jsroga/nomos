'use client'

import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import {
  ORBIT_CONTROLS_TARGET_KEY,
  ORBIT_CONTROLS_UPDATE_KEY,
  ORTHOGRAPHIC_CAMERA_ZOOM_KEY,
} from '@/domains/3d-canvas/constants/camera-controller'
import { useInteriorStore } from '@/domains/3d-canvas'
import { recordFromJson } from '@/shared/data/json-guards'

interface OrbitControlsLike {
  target: THREE.Vector3
  update: () => void
}

function hasOrbitControls(controls: unknown): controls is OrbitControlsLike {
  if (typeof controls !== 'object' || controls === null) return false
  if (!(ORBIT_CONTROLS_TARGET_KEY in controls) || !(ORBIT_CONTROLS_UPDATE_KEY in controls)) {
    return false
  }
  const record = recordFromJson(controls)
  const target = record[ORBIT_CONTROLS_TARGET_KEY]
  const update = record[ORBIT_CONTROLS_UPDATE_KEY]
  return target instanceof THREE.Vector3 && typeof update === 'function'
}

// Disco Elysium style camera - user-configured position
const DISCO_ELYSIUM_POSITION: [number, number, number] = [20.8, 13.1, 17.6]
const DISCO_ELYSIUM_TARGET: [number, number, number] = [0, 0, 0]
const DISCO_ELYSIUM_ZOOM = 70

export const CameraController: React.FC = () => {
  const { camera, controls } = useThree()
  const cameraResetRequested = useInteriorStore(state => state.cameraResetRequested)
  const setCameraResetRequested = useInteriorStore(state => state.setCameraResetRequested)

  useEffect(() => {
    if (cameraResetRequested) {
      // Reset camera position to Disco Elysium style
      camera.position.set(...DISCO_ELYSIUM_POSITION)
      camera.lookAt(...DISCO_ELYSIUM_TARGET)

      // Set zoom for orthographic camera
      if (ORTHOGRAPHIC_CAMERA_ZOOM_KEY in camera && typeof camera.zoom === 'number') {
        camera.zoom = DISCO_ELYSIUM_ZOOM
      }
      camera.updateProjectionMatrix()

      // Reset OrbitControls target if available
      if (hasOrbitControls(controls)) {
        controls.target.set(...DISCO_ELYSIUM_TARGET)
        controls.update()
      }

      // Clear the reset request
      setCameraResetRequested(false)
    }
  }, [cameraResetRequested, camera, controls, setCameraResetRequested])

  return null
}
