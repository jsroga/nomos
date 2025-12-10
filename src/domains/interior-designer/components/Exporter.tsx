'use client'

import React, { useEffect } from 'react'
import { useInteriorStore } from '@/domains/interior-designer/store/useInteriorStore'
import { useThree } from '@react-three/fiber'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'

export const Exporter: React.FC = () => {
  const exportRequested = useInteriorStore(state => state.exportRequested)
  const setExportRequested = useInteriorStore(state => state.setExportRequested)
  const { scene } = useThree()

  useEffect(() => {
    if (exportRequested) {
      const exporter = new GLTFExporter()
      exporter.parse(
        scene,
        gltf => {
          const output = JSON.stringify(gltf, null, 2)
          const blob = new Blob([output], { type: 'text/plain' })
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.style.display = 'none'
          link.href = url
          link.download = 'interior-design.gltf'
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)

          setExportRequested(false)
        },
        error => {
          console.error('An error happened during export:', error)
          setExportRequested(false)
        },
        {
          onlyVisible: true,
          // binary: true // .glb
        }
      )
    }
  }, [exportRequested, scene, setExportRequested])

  return null
}
