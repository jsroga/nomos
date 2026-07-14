'use client'

import React, { useEffect } from 'react'
import {
  EXPORT_ERROR_LOG,
  EXPORT_LINK_DISPLAY_NONE,
  INTERIOR_DESIGN_GLTF_FILENAME,
} from '@/domains/interior-designer/constants/export'
import { useInteriorStore } from '@/domains/interior-designer'
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
          link.style.display = EXPORT_LINK_DISPLAY_NONE
          link.href = url
          link.download = INTERIOR_DESIGN_GLTF_FILENAME
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)

          setExportRequested(false)
        },
        error => {
          console.error(EXPORT_ERROR_LOG, error)
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
