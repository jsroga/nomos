'use client'

import React, { useEffect, useState } from 'react'
import { TransformControls } from '@react-three/drei'
import { useInteriorStore } from '@/domains/interior-designer'
import {
  INTERACTION_MODE_SELECT,
  TransformMode,
} from '@/domains/interior-designer/constants/interaction-modes'
import { OrbitControlsProperty } from '@/domains/interior-designer/constants/three-js'
import { DOM_EVENT_KEYDOWN } from '@/domains/interior-designer/constants/keyboard'
import { DomTagName } from '@/shared/data/constants/protocol'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'

function setOrbitControlsEnabled(controls: unknown, enabled: boolean): void {
  if (typeof controls === 'object' && controls !== null && OrbitControlsProperty.Enabled in controls) {
    Object.assign(controls, { [OrbitControlsProperty.Enabled]: enabled })
  }
}

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
      if (document.activeElement?.tagName === DomTagName.Input) return

      switch (e.key.toLowerCase()) {
        case 'g':
          setTransformMode(TransformMode.Translate)
          break
        case 'r':
          setTransformMode(TransformMode.Rotate)
          break
        case 's':
          setTransformMode(TransformMode.Scale)
          break
      }
    }
    window.addEventListener(DOM_EVENT_KEYDOWN, handleKeyDown)
    return () => window.removeEventListener(DOM_EVENT_KEYDOWN, handleKeyDown)
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

  if (mode !== INTERACTION_MODE_SELECT || !isValidSelection || !target) {
    return null
  }

  return (
    <TransformControls
      object={target}
      mode={transformMode}
      translationSnap={snapEnabled ? snapSize : undefined}
      rotationSnap={snapEnabled ? Math.PI / 12 : undefined}
      // Always hide Y handle for objects in translate mode - objects must be at Y=0
      // For surfaces, respect lockY setting
      showY={
        transformMode === TransformMode.Translate
          ? selectedObject
            ? false // Objects always locked to Y=0
            : !lockY // Surfaces respect lockY setting
          : true
      }
      onMouseDown={() => {
        setOrbitControlsEnabled(controls, false)
      }}
      onMouseUp={() => {
        setOrbitControlsEnabled(controls, true)

        // Update store on drag end
        if (target) {
          if (selectedObject) {
            // Always enforce Y=0 for objects - they must be snapped to bottom of level
            // The level offset is handled by the parent group position in ObjectManager
            updateObject(selectedObject.id, {
              position: [target.position.x, 0, target.position.z],
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
