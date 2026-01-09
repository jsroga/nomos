import React, { useEffect } from 'react'
import { useInteriorStore } from '@/domains/interior-designer/store/useInteriorStore'
import { useThree } from '@react-three/fiber'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import * as THREE from 'three'
import { useGlobalStatusStore } from '@/store/useGlobalStatusStore'

export const RetextureExporter: React.FC = () => {
  const requestRetextureExport = useInteriorStore(state => state.requestRetextureExport)
  const setRequestRetextureExport = useInteriorStore(state => state.setRequestRetextureExport)
  const setRetextureModelBase64 = useInteriorStore(state => state.setRetextureModelBase64)
  const selectedId = useInteriorStore(state => state.selectedId)
  const updateOperation = useGlobalStatusStore(state => state.updateOperation)
  const { scene } = useThree()

  useEffect(() => {
    if (requestRetextureExport && selectedId) {
      let targetObject: THREE.Object3D | null = null

      scene.traverse((child) => {
        // Check both name (objects) and userData.id (surfaces)
        if (child.name === selectedId || (child.userData && child.userData.id === selectedId)) {
          targetObject = child
        }
      })

      if (targetObject) {
        console.log('📦 Starting Retexture Export for:', selectedId)
        console.log('📏 Original Transform:', {
          position: targetObject.position.toArray(),
          rotation: targetObject.rotation.toArray(),
          scale: targetObject.scale.toArray(),
        })

        const box = new THREE.Box3().setFromObject(targetObject)
        const center = new THREE.Vector3()
        const size = new THREE.Vector3()
        box.getCenter(center)
        box.getSize(size)
        console.log('📐 Bounding Box:', {
          min: box.min.toArray(),
          max: box.max.toArray(),
          size: size.toArray(),
          center: center.toArray()
        })

        // Store the original bounding box info in the operation for proper alignment
        const operationId = `retexture-${selectedId}`
        const existingOp = useGlobalStatusStore.getState().operations.find(op => op.id === operationId)
        if (existingOp) {
          try {
            const metadata = JSON.parse(existingOp.details || '{}')
            updateOperation(operationId, {
              details: JSON.stringify({
                ...metadata,
                originalBoundingBox: {
                  min: box.min.toArray(),
                  max: box.max.toArray(),
                  center: center.toArray(),
                  size: size.toArray()
                }
              })
            })
          } catch (e) {
            console.error('Failed to update operation with bounding box:', e)
          }
        }

        const exporter = new GLTFExporter()
        exporter.parse(
          targetObject!,
          (gltf) => {
            // Match Exporter.tsx: binary: false returns a JSON object
            const output = JSON.stringify(gltf, null, 2)
            console.log('💾 GLTF JSON Size:', output.length)

            // Use correct MIME type for GLTF so Meshy API recognizes it
            const blob = new Blob([output], { type: 'model/gltf+json' })
            const reader = new FileReader()
            reader.readAsDataURL(blob)
            reader.onloadend = () => {
              const base64data = reader.result as string
              console.log('✅ Base64 Data Ready (prefix):', base64data.substring(0, 50))
              setRetextureModelBase64(base64data)
              setRequestRetextureExport(false)
            }
          },
          (error) => {
            console.error('❌ An error happened during retexture export:', error)
            setRequestRetextureExport(false)
          },
          {
            binary: false, // Match Exporter.tsx
            onlyVisible: true
          }
        )
      } else {
        console.error('❌ Object not found for retexture export:', selectedId)
        setRequestRetextureExport(false)
      }
    }
  }, [requestRetextureExport, selectedId, scene, setRequestRetextureExport, setRetextureModelBase64])

  return null
}
