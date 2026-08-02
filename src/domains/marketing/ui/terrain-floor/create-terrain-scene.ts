import {
  DOCUMENT_VISIBILITY_HIDDEN,
  DOM_EVENT_RESIZE,
  DOM_EVENT_VISIBILITY_CHANGE,
  WEBGL_POWER_PREFERENCE_HIGH_PERFORMANCE,
} from '@/domains/marketing/constants/liquid'
import {
  DOM_EVENT_POINTER_MOVE,
  TERRAIN_FLOOR_CAMERA,
  TERRAIN_FLOOR_COLOR_HIGH,
  TERRAIN_FLOOR_COLOR_LOW,
  TERRAIN_TRAIL_LENGTH,
  TerrainFloorGrid,
  TerrainFloorShape,
  TerrainFloorStyle,
  TERRAIN_FLOOR_MAX_PIXEL_RATIO,
} from '@/domains/marketing/constants/terrain-floor'
import {
  MarketingDomScrollEvent,
  MarketingMediaQuery,
} from '@/domains/marketing/constants/viewport-3d'
import { BufferGeometryAttribute } from '@/shared/three/constants/buffer-geometry-attribute'
import {
  TERRAIN_FLOOR_FRAGMENT_SHADER,
  TERRAIN_FLOOR_VERTEX_SHADER,
} from './terrain-shaders'
import type * as ThreeNamespace from 'three'

type Three = typeof ThreeNamespace

function buildGridPositions(cols: number, rows: number): Float32Array {
  const positions = new Float32Array(cols * rows * 3)
  const halfWidth = TerrainFloorGrid.Width / 2
  const halfDepth = TerrainFloorGrid.Depth / 2
  let i = 0
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      positions[i++] = (col / (cols - 1)) * TerrainFloorGrid.Width - halfWidth
      positions[i++] = 0
      positions[i++] = (row / (rows - 1)) * TerrainFloorGrid.Depth - halfDepth
    }
  }
  return positions
}

export function createTerrainFloorScene(THREE: Three, container: HTMLDivElement): () => void {
  const isMobile = window.matchMedia(MarketingMediaQuery.MobileMaxWidth).matches
  const cols = isMobile ? TerrainFloorGrid.ColsMobile : TerrainFloorGrid.Cols
  const rows = isMobile ? TerrainFloorGrid.RowsMobile : TerrainFloorGrid.Rows

  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    alpha: true,
    powerPreference: WEBGL_POWER_PREFERENCE_HIGH_PERFORMANCE,
    preserveDrawingBuffer: false,
  })
  const maxDpr = TERRAIN_FLOOR_MAX_PIXEL_RATIO
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDpr))
  renderer.setSize(container.clientWidth, container.clientHeight)
  container.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(
    TERRAIN_FLOOR_CAMERA.Fov,
    container.clientWidth / Math.max(1, container.clientHeight),
    0.1,
    60,
  )
  camera.position.set(TERRAIN_FLOOR_CAMERA.PosX, TERRAIN_FLOOR_CAMERA.PosY, TERRAIN_FLOOR_CAMERA.PosZ)
  camera.lookAt(TERRAIN_FLOOR_CAMERA.LookX, TERRAIN_FLOOR_CAMERA.LookY, TERRAIN_FLOOR_CAMERA.LookZ)

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    BufferGeometryAttribute.Position,
    new THREE.BufferAttribute(buildGridPositions(cols, rows), 3),
  )

  const trail = Array.from(
    { length: TERRAIN_TRAIL_LENGTH },
    () => new THREE.Vector4(0, 0, -1000, 0),
  )
  const material = new THREE.ShaderMaterial({
    vertexShader: TERRAIN_FLOOR_VERTEX_SHADER,
    fragmentShader: TERRAIN_FLOOR_FRAGMENT_SHADER,
    uniforms: {
      uTime: { value: 0 },
      uHover: { value: 0 },
      uTrail: { value: trail },
      uBaseAmplitude: { value: TerrainFloorShape.BaseAmplitude },
      uBumpAmplitude: { value: TerrainFloorShape.BumpAmplitude },
      uBumpRadius: { value: TerrainFloorShape.BumpRadius },
      uErodeRate: { value: TerrainFloorShape.ErodeRate },
      uDriftSpeed: { value: TerrainFloorShape.DriftSpeed },
      uNoiseScale: { value: TerrainFloorShape.NoiseScale },
      uPointSize: {
        value: isMobile ? TerrainFloorStyle.PointSizeMobile : TerrainFloorStyle.PointSize,
      },
      uColorLow: { value: new THREE.Color(TERRAIN_FLOOR_COLOR_LOW) },
      uColorHigh: { value: new THREE.Color(TERRAIN_FLOOR_COLOR_HIGH) },
    },
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  })

  const points = new THREE.Points(geometry, material)
  points.frustumCulled = false
  scene.add(points)

  const startTime = performance.now()
  const nowSec = () => (performance.now() - startTime) / 1000

  let rect = container.getBoundingClientRect()
  let trailIndex = 0
  let lastStampX = Number.NaN
  let lastStampY = Number.NaN
  let hoverTarget = 0
  let hover = 0
  let inView = true
  let paused = document.visibilityState === DOCUMENT_VISIBILITY_HIDDEN
  let frameId: number | null = null

  const onPointerMove = (event: PointerEvent) => {
    const { clientX, clientY } = event
    const inside =
      clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom
    hoverTarget = inside ? 1 : 0
    if (!inside) return

    const dx = clientX - lastStampX
    const dy = clientY - lastStampY
    if (dx * dx + dy * dy < TerrainFloorStyle.MinStampDistancePx ** 2) return
    lastStampX = clientX
    lastStampY = clientY

    const u = (clientX - rect.left) / Math.max(1, rect.width)
    const v = (clientY - rect.top) / Math.max(1, rect.height)
    trail[trailIndex]?.set(
      (u - 0.5) * TerrainFloorGrid.Width,
      (v - 0.5) * TerrainFloorGrid.Depth,
      nowSec(),
      1,
    )
    trailIndex = (trailIndex + 1) % TERRAIN_TRAIL_LENGTH
  }

  const updateRect = () => {
    rect = container.getBoundingClientRect()
  }

  const handleResize = () => {
    updateRect()
    renderer.setSize(container.clientWidth, container.clientHeight)
    camera.aspect = container.clientWidth / Math.max(1, container.clientHeight)
    camera.updateProjectionMatrix()
  }

  const handleVisibility = () => {
    paused = document.visibilityState === DOCUMENT_VISIBILITY_HIDDEN
  }

  const observer = new IntersectionObserver(entries => {
    inView = entries[0]?.isIntersecting ?? true
  })
  observer.observe(container)

  const animate = () => {
    frameId = requestAnimationFrame(animate)
    if (paused || !inView) return
    hover += (hoverTarget - hover) * 0.08
    material.uniforms.uTime.value = nowSec()
    material.uniforms.uHover.value = hover
    renderer.render(scene, camera)
  }

  window.addEventListener(DOM_EVENT_POINTER_MOVE, onPointerMove, { passive: true })
  window.addEventListener(DOM_EVENT_RESIZE, handleResize)
  window.addEventListener(MarketingDomScrollEvent.Scroll, updateRect, { passive: true })
  document.addEventListener(DOM_EVENT_VISIBILITY_CHANGE, handleVisibility)
  animate()

  return () => {
    observer.disconnect()
    window.removeEventListener(DOM_EVENT_POINTER_MOVE, onPointerMove)
    window.removeEventListener(DOM_EVENT_RESIZE, handleResize)
    window.removeEventListener(MarketingDomScrollEvent.Scroll, updateRect)
    document.removeEventListener(DOM_EVENT_VISIBILITY_CHANGE, handleVisibility)
    if (frameId !== null) cancelAnimationFrame(frameId)
    if (renderer.domElement.parentNode === container) {
      container.removeChild(renderer.domElement)
    }
    geometry.dispose()
    material.dispose()
    renderer.dispose()
  }
}
