'use client'

import React, { useEffect, useRef, useState } from 'react'
import { TransformControls } from '@react-three/drei'
import { useInteriorStore } from '@/domains/interior-designer/store/useInteriorStore'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'

export const TransformManager: React.FC = () => {
  const selectedId = useInteriorStore(state => state.selectedId)
  const objects = useInteriorStore(state => state.objects)
  const updateObject = useInteriorStore(state => state.updateObject)
  const mode = useInteriorStore(state => state.mode)

  const lockY = useInteriorStore(state => state.lockY)
  const snapEnabled = useInteriorStore(state => state.snapEnabled)
  const snapSize = useInteriorStore(state => state.snapSize)

  const transformMode = useInteriorStore(state => state.transformMode)
  const setTransformMode = useInteriorStore(state => state.setTransformMode)

  const { scene, controls } = useThree()

  // We only support transforming objects for now, not walls/floors
  const selectedObject = objects.find(o => o.id === selectedId)
  const surfaces = useInteriorStore(state => state.surfaces)
  const selectedSurface = surfaces.find(s => s.id === selectedId)
  const updateSurface = useInteriorStore(state => state.updateSurface)

  const isValidSelection = selectedObject || selectedSurface

  // Find the actual mesh in the scene to attach to
  const [target, setTarget] = useState<THREE.Object3D | undefined>(undefined)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if typing in an input
      if (document.activeElement?.tagName === 'INPUT') return

      switch (e.key.toLowerCase()) {
        case 'g':
          setTransformMode('translate')
          break
        case 'r':
          setTransformMode('rotate')
          break
        case 's':
          setTransformMode('scale')
          break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setTransformMode])

  useEffect(() => {
    if (selectedId) {
      // We need to find the object in the scene graph
      // The ObjectManager renders groups with the ID as key, but we can't easily select by key
      // So we might need to rely on the ObjectManager to forward refs or use a name
      // For now, let's try finding by name if we set it, or just rely on the position/rotation/scale
      // Actually, TransformControls can work without an attached object if we manually update the matrix,
      // but it's easier if we attach.

      // Let's assume ObjectManager sets the name of the group to the ID
      const obj = scene.getObjectByName(selectedId)
      setTarget(obj)
    } else {
      setTarget(undefined)
    }
  }, [selectedId, scene, objects]) // Re-run if objects change (e.g. position update)

  if (mode !== 'SELECT' || !isValidSelection || !target) {
    return null
  }

  return (
    <TransformControls
      object={target}
      mode={transformMode}
      translationSnap={snapEnabled ? snapSize : undefined}
      rotationSnap={snapEnabled ? Math.PI / 12 : undefined}
      showY={transformMode === 'translate' ? !lockY : true}
      onMouseDown={() => {
        const orbitControls = controls as unknown as { enabled: boolean }
        if (orbitControls) {
          orbitControls.enabled = false
        }
      }}
      onMouseUp={() => {
        const orbitControls = controls as unknown as { enabled: boolean }
        if (orbitControls) {
          orbitControls.enabled = true
        }

        // Update store on drag end
        if (target) {
          if (selectedObject) {
            updateObject(selectedObject.id, {
              position: [target.position.x, target.position.y, target.position.z],
              rotation: [target.rotation.x, target.rotation.y, target.rotation.z],
              scale: [target.scale.x, target.scale.y, target.scale.z],
            })
          } else if (selectedSurface) {
            updateSurface(selectedSurface.id, {
              // Surfaces are group-based, so we update the group transform
              // Position is usually [0,0,0] relative to parent, but if we move it, we update it?
              // Usually surface geometry handles position. Let's focus on rotation for now.
              // Actually, if we translate, we might want to move points? 
              // No, that's complex. Let's start with just rotation as requested.
              rotation: [target.rotation.x, target.rotation.y, target.rotation.z],
            })
          }
        }
      }}
    />
  )
}
