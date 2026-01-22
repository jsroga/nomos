 
'use client'

import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { useInteriorStore } from '@/domains/interior-designer/store/useInteriorStore'

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
      if ('zoom' in camera) {
        ;(camera as any).zoom = DISCO_ELYSIUM_ZOOM
      }
      camera.updateProjectionMatrix()

      // Reset OrbitControls target if available
      if (controls && 'target' in controls && 'update' in controls) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const orbitControls = controls as any
        orbitControls.target.set(...DISCO_ELYSIUM_TARGET)
        orbitControls.update()
      }

      // Clear the reset request
      setCameraResetRequested(false)
    }
  }, [cameraResetRequested, camera, controls, setCameraResetRequested])

  return null
}
