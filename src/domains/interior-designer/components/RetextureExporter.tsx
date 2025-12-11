import React, { useEffect } from 'react'
import { useInteriorStore } from '@/domains/interior-designer/store/useInteriorStore'
import { useThree } from '@react-three/fiber'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import * as THREE from 'three'

export const RetextureExporter: React.FC = () => {
  const requestRetextureExport = useInteriorStore(state => state.requestRetextureExport)
  const setRequestRetextureExport = useInteriorStore(state => state.setRequestRetextureExport)
  const setRetextureModelBase64 = useInteriorStore(state => state.setRetextureModelBase64)
  const selectedId = useInteriorStore(state => state.selectedId)
  const { scene } = useThree()

  useEffect(() => {
    if (requestRetextureExport && selectedId) {
      let targetObject: THREE.Object3D | null = null

      scene.traverse((child) => {
        if (child.userData && child.userData.id === selectedId) {
          targetObject = child
        }
      })

      if (targetObject) {
        const exporter = new GLTFExporter()
        exporter.parse(
          targetObject!,
          (gltf) => {
            // Match Exporter.tsx: binary: false returns a JSON object
            const output = JSON.stringify(gltf, null, 2)
            // Use correct MIME type for GLTF so Meshy API recognizes it
            const blob = new Blob([output], { type: 'model/gltf+json' })
            const reader = new FileReader()
            reader.readAsDataURL(blob)
            reader.onloadend = () => {
              const base64data = reader.result as string
              setRetextureModelBase64(base64data)
              setRequestRetextureExport(false)
            }
          },
          (error) => {
            console.error('An error happened during retexture export:', error)
            setRequestRetextureExport(false)
          },
          {
            binary: false, // Match Exporter.tsx
            onlyVisible: true
          }
        )
      } else {
        console.error('Object not found for retexture export:', selectedId)
        setRequestRetextureExport(false)
      }
    }
  }, [requestRetextureExport, selectedId, scene, setRequestRetextureExport, setRetextureModelBase64])

  return null
}
