import React, { useEffect } from 'react'
import { useInteriorStore } from '@/domains/interior-designer'
import {
  RETEXTURE_EMPTY_METADATA,
} from '@/domains/interior-designer/constants/retexture-slice-log'
import {
  RetextureExporterLog,
  RetextureExporterMimeType,
} from '@/domains/interior-designer/constants/retexture-exporter-log'
import { useThree } from '@react-three/fiber'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import * as THREE from 'three'
import { useGlobalStatusStore } from '@/shared/jobs/useGlobalStatusStore'

function findSelectedObject(scene: THREE.Object3D, selectedId: string): THREE.Object3D | null {
  let found: THREE.Object3D | null = null
  scene.traverse(child => {
    if (child.name === selectedId || child.userData?.id === selectedId) {
      found = child
    }
  })
  return found
}

export const RetextureExporter: React.FC = () => {
  const requestRetextureExport = useInteriorStore(state => state.requestRetextureExport)
  const setRequestRetextureExport = useInteriorStore(state => state.setRequestRetextureExport)
  const setRetextureModelBase64 = useInteriorStore(state => state.setRetextureModelBase64)
  const selectedId = useInteriorStore(state => state.selectedId)
  const updateOperation = useGlobalStatusStore(state => state.updateOperation)
  const { scene } = useThree()

  useEffect(() => {
    if (requestRetextureExport && selectedId) {
      const exportTarget = findSelectedObject(scene, selectedId)

      if (exportTarget) {
        console.log(RetextureExporterLog.StartingExport, selectedId)
        console.log(RetextureExporterLog.OriginalTransform, {
          position: exportTarget.position.toArray(),
          rotation: exportTarget.rotation.toArray(),
          scale: exportTarget.scale.toArray(),
        })

        const box = new THREE.Box3().setFromObject(exportTarget)
        const center = new THREE.Vector3()
        const size = new THREE.Vector3()
        box.getCenter(center)
        box.getSize(size)
        console.log(RetextureExporterLog.BoundingBox, {
          min: box.min.toArray(),
          max: box.max.toArray(),
          size: size.toArray(),
          center: center.toArray(),
        })

        // Store the original bounding box info in the operation for proper alignment
        const operationId = `retexture-${selectedId}`
        const existingOp = useGlobalStatusStore
          .getState()
          .operations.find(op => op.id === operationId)
        if (existingOp) {
          try {
            const metadata = JSON.parse(existingOp.details || RETEXTURE_EMPTY_METADATA)
            updateOperation(operationId, {
              details: JSON.stringify({
                ...metadata,
                originalBoundingBox: {
                  min: box.min.toArray(),
                  max: box.max.toArray(),
                  center: center.toArray(),
                  size: size.toArray(),
                },
              }),
            })
          } catch (e) {
            console.error(RetextureExporterLog.UpdateBoundingBoxFailed, e)
          }
        }

        const exporter = new GLTFExporter()
        exporter.parse(
          exportTarget,
          gltf => {
            // Match Exporter.tsx: binary: false returns a JSON object
            const output = JSON.stringify(gltf, null, 2)
            console.log(RetextureExporterLog.GltfJsonSize, output.length)

            // Use correct MIME type for GLTF so Meshy API recognizes it
            const blob = new Blob([output], { type: RetextureExporterMimeType.GltfJson })
            const reader = new FileReader()
            reader.readAsDataURL(blob)
            reader.onloadend = () => {
              if (typeof reader.result !== 'string') return
              const base64data = reader.result
              console.log(RetextureExporterLog.Base64Ready, base64data.substring(0, 50))
              setRetextureModelBase64(base64data)
              setRequestRetextureExport(false)
            }
          },
          error => {
            console.error(RetextureExporterLog.ExportError, error)
            setRequestRetextureExport(false)
          },
          {
            binary: false, // Match Exporter.tsx
            onlyVisible: true,
          }
        )
      } else {
        console.error(RetextureExporterLog.ObjectNotFound, selectedId)
        setRequestRetextureExport(false)
      }
    }
  }, [
    requestRetextureExport,
    selectedId,
    scene,
    setRequestRetextureExport,
    setRetextureModelBase64,
  ])

  return null
}
