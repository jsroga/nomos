'use client'

import React, { useRef, useMemo, useState, useEffect } from 'react'
import * as THREE from 'three'

// Lazy-loaded Three.js components
let Canvas: any = null
let useFrame: any = null
let useGLTF: any = null

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════
export type IconType =
  | 'WORLD_GEN'
  | 'AI_NARRATIVE'
  | 'SCULPT_SIM'
  | 'EXPORT_SEC'
  | 'LOP_DES'
  | 'STR_TST'
  | 'SEC_AST'
  | 'GENERATOR'
  | 'NEURAL'
  | 'EXPORTER'

interface ThreeDIconProps {
  type: string
  color?: string
  size?: number
  scale?: number
  offset?: [number, number]
  density?: number
  glowScale?: number
  mouseRotation?: number
  distortion?: number
  speed?: number
}

// Scale context
const ScaleContext = React.createContext(1)

// Mouse position context for passing mouse data into Canvas
const MousePositionContext = React.createContext<React.RefObject<{ x: number; y: number }> | null>(null)

function MouseRotationGroup({ children, intensity = 0 }: { children: React.ReactNode; intensity?: number }) {
  const groupRef = useRef<THREE.Group>(null)
  const mouseRef = React.useContext(MousePositionContext)
  const currentRotation = useRef({ x: 0, y: 0 })

  useFrame(() => {
    if (!intensity || !groupRef.current || !mouseRef?.current) return
    const targetX = -mouseRef.current.y * intensity
    const targetY = mouseRef.current.x * intensity
    currentRotation.current.x += (targetX - currentRotation.current.x) * 0.05
    currentRotation.current.y += (targetY - currentRotation.current.y) * 0.05
    groupRef.current.rotation.x = currentRotation.current.x
    groupRef.current.rotation.y = currentRotation.current.y
  })

  return <group ref={groupRef}>{children}</group>
}

// ═══════════════════════════════════════════════════════════════════
// LIGHTWEIGHT ORGANIC TUBE
// ═══════════════════════════════════════════════════════════════════
function createSimpleTube(
  curve: THREE.Curve<THREE.Vector3>,
  segments: number = 32,
  radius: number = 0.03,
  radialSegments: number = 8
): THREE.BufferGeometry {
  return new THREE.TubeGeometry(curve, segments, radius, radialSegments, false)
}

/**
 * Simple flowing curve
 */
function createFlowingCurve(
  start: THREE.Vector3,
  end: THREE.Vector3,
  wave: number = 0.2,
  seed: number = 0
): THREE.CatmullRomCurve3 {
  const points: THREE.Vector3[] = []
  const segments = 12

  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const p = start.clone().lerp(end, t)
    p.x += Math.sin(t * Math.PI * 2 + seed) * wave
    p.y += Math.sin(t * Math.PI * 1.5 + seed * 0.7) * wave * 0.5
    points.push(p)
  }

  return new THREE.CatmullRomCurve3(points)
}

// ═══════════════════════════════════════════════════════════════════
// SMOOTH GLOWING SPHERE
// ═══════════════════════════════════════════════════════════════════
function GlowingSphere({
  position = [0, 0, 0] as [number, number, number],
  radius = 0.12,
  color = '#a855f7',
  distortion = 0,
  speed = 1,
}: {
  position?: [number, number, number]
  radius?: number
  color?: string
  distortion?: number
  speed?: number
}) {
  const meshRef = useRef<THREE.Mesh>(null)

  // Lazy load MeshDistortMaterial if possible, or just use it from drei
  // Since we are inside ThreeDIcon, we can try to use standard material if distortion is 0
  // But for better effect, let's use MeshDistortMaterial when available.
  // Note: We need to import MeshDistortMaterial dynamically or assume it's available.
  // Given we are lazy loading drei, we might need a way to access it.
  // However, simpler approach for now: standard material with manual vertex displacement if we can't get DistortMaterial easily
  // OR, we can try to use a simple custom shader.
  // ACTUALLY, checking imports: we lazy load 'useGLTF' from drei.
  // Let's modify the lazy loader to also export MeshDistortMaterial.

  const [distortMaterial, setDistortMaterial] = useState<any>(null)

  useEffect(() => {
    import('@react-three/drei').then((mod) => {
      setDistortMaterial(() => mod.MeshDistortMaterial)
    })
  }, [])

  useFrame((state: any) => {
    if (meshRef.current && distortion === 0) {
      // Only pulse if no distortion logic handles movement
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.15
      meshRef.current.scale.setScalar(pulse)
    }
  })

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[radius, 64, 64]} />
        {/* Increased segments for better distortion */}

        {distortMaterial && distortion > 0 ? (
          React.createElement(distortMaterial, {
            color: color,
            emissive: color,
            emissiveIntensity: 2,
            toneMapped: false,
            distort: distortion, // Strength, 0 disables
            speed: speed, // Speed (default 1)
          })
        ) : (
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={3}
            toneMapped={false}
          />
        )}
      </mesh>
      <mesh>
        <sphereGeometry args={[radius * 2.2, 12, 12]} />
        <meshBasicMaterial color={color} transparent opacity={0.25} side={THREE.BackSide} />
      </mesh>
    </group>
  )
}

// FloatingOrbs removed - not needed for performance

// ═══════════════════════════════════════════════════════════════════
// POINT CLOUD DOTS EFFECT
// ═══════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════
// POINT CLOUD DOTS EFFECT
// ═══════════════════════════════════════════════════════════════════
const dotsVertexShader = `
  attribute float size;
  attribute float brightness;
  varying float vBrightness;
  uniform float time;
  
  void main() {
    vBrightness = brightness;
    
    // Organic noise movement
    vec3 pos = position;
    float noise = sin(pos.x * 8.0 + time) * cos(pos.y * 6.0 + time * 0.7);
    pos.x += noise * 0.015;
    pos.y += cos(pos.z * 7.0 + time * 0.8) * 0.012;
    pos.z += sin(pos.y * 5.0 + time * 0.6) * 0.015;
    
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = size * (150.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const dotsFragmentShader = `
  varying float vBrightness;
  uniform vec3 color;
  
  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    
    float alpha = smoothstep(0.5, 0.25, dist);
    vec3 finalColor = color * vBrightness * 0.85;
    gl_FragColor = vec4(finalColor, alpha * 0.75);
  }
`

/**
 * Convert geometry to point cloud
 */
function geometryToPoints(
  geometry: THREE.BufferGeometry,
  density: number = 0.5
): { positions: Float32Array; sizes: Float32Array; brightnesses: Float32Array } {
  const positions: number[] = []
  const sizes: number[] = []
  const brightnesses: number[] = []

  const posAttr = geometry.attributes.position
  const normalAttr = geometry.attributes.normal

  // Sample vertices - lower density = larger step = fewer points
  const step = Math.max(1, Math.round(1 / density))
  for (let i = 0; i < posAttr.count; i += step) {
    positions.push(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i))

    // Size variation - smaller dots
    sizes.push(0.008 + Math.random() * 0.006)

    // Brightness based on normal (if available) - reduced brightness
    if (normalAttr) {
      const ny = normalAttr.getY(i)
      brightnesses.push(0.5 + ny * 0.35 + Math.random() * 0.15)
    } else {
      brightnesses.push(0.55 + Math.random() * 0.25)
    }
  }

  return {
    positions: new Float32Array(positions),
    sizes: new Float32Array(sizes),
    brightnesses: new Float32Array(brightnesses),
  }
}

/**
 * Point cloud dots overlay
 */
function PointCloudDots({
  geometry,
  color = '#ffffff',
  density = 1.5,
}: {
  geometry: THREE.BufferGeometry
  color?: string
  density?: number
}) {
  const pointsData = useMemo(() => geometryToPoints(geometry, density), [geometry, density])

  const pointsGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pointsData.positions, 3))
    geo.setAttribute('size', new THREE.BufferAttribute(pointsData.sizes, 1))
    geo.setAttribute('brightness', new THREE.BufferAttribute(pointsData.brightnesses, 1))
    return geo
  }, [pointsData])

  const material = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      vertexShader: dotsVertexShader,
      fragmentShader: dotsFragmentShader,
      uniforms: {
        color: { value: new THREE.Color(color) },
        time: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    return mat
  }, [color])

  useFrame((state: any) => {
    if (material.uniforms.time) {
      material.uniforms.time.value = state.clock.elapsedTime * 0.5
    }
  })

  return <points geometry={pointsGeometry} material={material} />
}

// ═══════════════════════════════════════════════════════════════════
// GLTF MODEL LOADER WITH EFFECTS
// ═══════════════════════════════════════════════════════════════════
interface GLTFModelProps {
  url: string
  scale?: number
  dotsColor?: string
  dotsDensity?: number
  glowScale?: number
}

function GLTFModel({
  url,
  scale = 1,
  dotsColor = '#ffffff',
  dotsDensity = 0.25,
  dotsDensity = 0.25,
  glowScale = 1,
  distortion = 0,
  speed = 2,
}: GLTFModelProps) {
  const groupRef = useRef<THREE.Group>(null)
  const gltf = useGLTF(url)

  const geometries = useMemo(() => {
    if (!gltf) return []
    const geos: THREE.BufferGeometry[] = []

    gltf.scene.traverse((child: any) => {
      if (child.isMesh && child.geometry) {
        const geo = child.geometry.clone()
        if (child.matrixWorld) {
          geo.applyMatrix4(child.matrixWorld)
        }
        geo.computeVertexNormals()
        geos.push(geo)
      }
    })
    return geos
  }, [gltf])

  useFrame((state: any) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.12
    }
  })

  if (geometries.length === 0) {
    return null
  }

  return (
    <group ref={groupRef} scale={scale}>
      {geometries.map((geo, i) => (
        <PointCloudDots key={i} geometry={geo} color={dotsColor} density={dotsDensity} />
      ))}
      <GlowingSphere position={[0.2, 0.1, 0.3]} radius={0.15 * glowScale} distortion={distortion} speed={speed} />
    </group>
  )
}

/**
 * Wrapper component for using GLTF models - call this from your code
 */
export function GLTFIcon({ url, size = 180, ...props }: GLTFModelProps & { size?: number }) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const loadThree = async () => {
      try {
        const [fiberModule, dreiModule] = await Promise.all([
          import('@react-three/fiber'),
          import('@react-three/drei'),
        ])
        Canvas = fiberModule.Canvas
        useFrame = fiberModule.useFrame
        useGLTF = dreiModule.useGLTF
        setIsLoaded(true)
      } catch (err) {
        console.error('Failed to load Three.js:', err)
        setHasError(true)
      }
    }
    loadThree()
  }, [])

  if (hasError || !isLoaded || !Canvas) {
    return (
      <div className="flex items-center justify-center" style={{ width: '100%', height: '100%' }}>
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas
        camera={{ position: [0, 0, 1.1], fov: 50 }}
        style={{ background: 'transparent' }}
        gl={{ alpha: true, antialias: false, powerPreference: 'high-performance' }}
        dpr={1}
        frameloop="always"
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[2, 2, 2]} intensity={1} />
        <React.Suspense fallback={null}>
          <GLTFModel url={url} {...props} />
        </React.Suspense>
      </Canvas>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// ICON SCULPTURES - Abstract Organic Forms
// ═══════════════════════════════════════════════════════════════════

function WorldGenSculpture() {
  const groupRef = useRef<THREE.Group>(null)

  const geometries = useMemo(() => {
    const geos: THREE.BufferGeometry[] = []

    // Core sphere - reduced segments
    geos.push(new THREE.SphereGeometry(0.25, 16, 16))

    // Orbital rings - reduced segments
    for (let i = 0; i < 2; i++) {
      const r = 0.38 + i * 0.12
      const torus = new THREE.TorusGeometry(r, 0.025, 6, 24)
      torus.rotateX(Math.PI / 2 + i * 0.4)
      torus.rotateY(i * 0.6)
      geos.push(torus)
    }

    // Flowing tendril - reduced segments
    const curve = createFlowingCurve(
      new THREE.Vector3(0, 0.2, 0),
      new THREE.Vector3(0.35, 0.55, 0.2),
      0.15,
      1
    )
    geos.push(createSimpleTube(curve, 16, 0.03, 6))

    return geos
  }, [])

  useFrame((state: any) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.15
    }
  })

  return (
    <group ref={groupRef}>
      {geometries.map((geo, i) => (
        <PointCloudDots key={i} geometry={geo} color="#ffffff" density={0.8} />
      ))}
      <GlowingSphere position={[0.4, 0.3, 0.2]} radius={0.12} />
    </group>
  )
}

function AINarrativeSculpture() {
  const groupRef = useRef<THREE.Group>(null)

  const geometries = useMemo(() => {
    const geos: THREE.BufferGeometry[] = []

    // Torus knot - brain-like form - reduced segments
    geos.push(new THREE.TorusKnotGeometry(0.22, 0.07, 48, 8, 2, 3))

    // Converging tendrils - reduced
    const directions = [
      [-0.45, -0.25, 0.1],
      [0.45, -0.2, 0.15],
      [0, -0.4, -0.15],
    ]

    directions.forEach((d, i) => {
      const curve = createFlowingCurve(
        new THREE.Vector3(d[0], d[1], d[2]),
        new THREE.Vector3(0, 0, 0),
        0.12,
        i
      )
      geos.push(createSimpleTube(curve, 12, 0.025, 6))
    })

    return geos
  }, [])

  useFrame((state: any) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.12
    }
  })

  return (
    <group ref={groupRef}>
      {geometries.map((geo, i) => (
        <PointCloudDots key={i} geometry={geo} color="#ffffff" density={0.8} />
      ))}
      <GlowingSphere position={[0, 0, 0.18]} radius={0.1} />
    </group>
  )
}

function SculptSimSculpture() {
  const groupRef = useRef<THREE.Group>(null)

  const geometries = useMemo(() => {
    const geos: THREE.BufferGeometry[] = []

    // Organic blob - distorted icosahedron - reduced detail
    const blob = new THREE.IcosahedronGeometry(0.28, 2)
    const pos = blob.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i),
        y = pos.getY(i),
        z = pos.getZ(i)
      const noise = Math.sin(x * 5) * Math.cos(y * 4) * 0.12
      pos.setXYZ(i, x * (1 + noise), y * (1 + noise * 0.7), z * (1 + noise))
    }
    blob.computeVertexNormals()
    geos.push(blob)

    // Emerging tendrils - reduced
    const dirs = [
      [0.6, 0.4, 0.2],
      [-0.55, 0.35, 0.4],
      [0.25, -0.6, 0.35],
    ]
    dirs.forEach((d, i) => {
      const dir = new THREE.Vector3(...(d as [number, number, number])).normalize()
      const curve = createFlowingCurve(
        dir.clone().multiplyScalar(0.22),
        dir.clone().multiplyScalar(0.5),
        0.1,
        i
      )
      geos.push(createSimpleTube(curve, 12, 0.03, 6))
    })

    return geos
  }, [])

  useFrame((state: any) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.1
    }
  })

  return (
    <group ref={groupRef}>
      {geometries.map((geo, i) => (
        <PointCloudDots key={i} geometry={geo} color="#ffffff" density={0.8} />
      ))}
      <GlowingSphere position={[0.25, 0.2, 0.25]} radius={0.1} />
    </group>
  )
}

function ExportSecSculpture() {
  const groupRef = useRef<THREE.Group>(null)

  const geometries = useMemo(() => {
    const geos: THREE.BufferGeometry[] = []

    // Central dodecahedron
    geos.push(new THREE.DodecahedronGeometry(0.18, 0))

    // Outward flowing ribbons - reduced
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2
      const dir = new THREE.Vector3(Math.cos(angle), 0.25, Math.sin(angle)).normalize()
      const curve = createFlowingCurve(
        dir.clone().multiplyScalar(0.15),
        dir.clone().multiplyScalar(0.5),
        0.1,
        i
      )
      geos.push(createSimpleTube(curve, 12, 0.025, 6))
    }

    return geos
  }, [])

  useFrame((state: any) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.18
    }
  })

  return (
    <group ref={groupRef}>
      {geometries.map((geo, i) => (
        <PointCloudDots key={i} geometry={geo} color="#ffffff" density={0.8} />
      ))}
      <GlowingSphere position={[0, 0, 0]} radius={0.1} />
    </group>
  )
}

function LoopDesSculpture() {
  const groupRef = useRef<THREE.Group>(null)

  const geometries = useMemo(() => {
    const geos: THREE.BufferGeometry[] = []

    // Figure-8 torus knot - reduced segments
    geos.push(new THREE.TorusKnotGeometry(0.28, 0.06, 48, 8, 2, 1))

    // Secondary intertwining torus - reduced
    const torus = new THREE.TorusGeometry(0.25, 0.03, 8, 24)
    torus.rotateX(Math.PI / 3)
    geos.push(torus)

    return geos
  }, [])

  useFrame((state: any) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.15
    }
  })

  return (
    <group ref={groupRef}>
      {geometries.map((geo, i) => (
        <PointCloudDots key={i} geometry={geo} color="#ffffff" density={0.8} />
      ))}
      <GlowingSphere position={[0.3, 0.12, 0.18]} radius={0.1} />
    </group>
  )
}

function StrTstSculpture() {
  const groupRef = useRef<THREE.Group>(null)

  const geometries = useMemo(() => {
    const geos: THREE.BufferGeometry[] = []

    // Central burst icosahedron
    geos.push(new THREE.IcosahedronGeometry(0.12, 1))

    // Radiating spikes - reduced
    for (let i = 0; i < 6; i++) {
      const theta = (i / 6) * Math.PI * 2
      const phi = Math.PI / 2 + (i % 2 === 0 ? 0.4 : -0.4)
      const dir = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.cos(phi),
        Math.sin(phi) * Math.sin(theta)
      )
      const curve = createFlowingCurve(new THREE.Vector3(0, 0, 0), dir.multiplyScalar(0.4), 0.08, i)
      geos.push(createSimpleTube(curve, 10, 0.025, 6))
    }

    return geos
  }, [])

  useFrame((state: any) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.2
    }
  })

  return (
    <group ref={groupRef}>
      {geometries.map((geo, i) => (
        <PointCloudDots key={i} geometry={geo} color="#ffffff" density={0.8} />
      ))}
      <GlowingSphere position={[0, 0, 0]} radius={0.12} />
    </group>
  )
}

function SecAstSculpture() {
  const groupRef = useRef<THREE.Group>(null)

  const geometries = useMemo(() => {
    const geos: THREE.BufferGeometry[] = []

    // Inner octahedron core
    geos.push(new THREE.OctahedronGeometry(0.15, 1))

    // Protective spiral wraps - reduced
    for (let i = 0; i < 3; i++) {
      const points: THREE.Vector3[] = []
      const baseAngle = (i / 3) * Math.PI * 2
      for (let j = 0; j <= 20; j++) {
        const t = j / 20
        const angle = baseAngle + t * Math.PI * 2
        const r = 0.25 + Math.sin(t * Math.PI) * 0.1
        const y = (t - 0.5) * 0.45
        points.push(new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r))
      }
      const curve = new THREE.CatmullRomCurve3(points)
      geos.push(createSimpleTube(curve, 16, 0.022, 6))
    }

    return geos
  }, [])

  useFrame((state: any) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.12
    }
  })

  return (
    <group ref={groupRef}>
      {geometries.map((geo, i) => (
        <PointCloudDots key={i} geometry={geo} color="#ffffff" density={0.8} />
      ))}
      <GlowingSphere position={[0, 0, 0.12]} radius={0.1} />
    </group>
  )
}

// ═══════════════════════════════════════════════════════════════════
// ICON SCENE WRAPPER - Using GLB models from public/3d-models
// ═══════════════════════════════════════════════════════════════════
function IconScene({
  type,
  density,
  glowScale,
}: {
  type: string
  density?: number
  type: string
  density?: number
  glowScale?: number
  distortion?: number
  speed?: number
}) {
  // Map icon types to GLB models
  // AI_NARRATIVE keeps low density (0.04), others get higher fidelity (0.15)
  // If density is provided via props, it overrides the defaults
  const lowDensity = density ?? 0.04
  const highDensity = density ?? 0.15

  const commonProps = {
    glowScale,
    distortion,
    speed,
  }

  switch (type) {
    case 'WORLD_GEN':
    case 'GENERATOR':
      // Cosmos generation - perfect for world building
      return (
        <GLTFModel
          url="/3d-models/Meshy_AI_Generate_the_cosmos__0120111501_texture.glb"
          scale={0.5}
          dotsDensity={highDensity}
          {...commonProps}
        />
      )
    case 'AI_NARRATIVE':
    case 'NEURAL':
      // Neural connections - AI storytelling (keep original sparse look)
      return (
        <GLTFModel
          url="/3d-models/Meshy_AI_Neural_Connections_0120093533_texture.glb"
          scale={0.5}
          dotsDensity={lowDensity}
          {...commonProps}
        />
      )
    case 'SCULPT_SIM':
      // Enchanted code cosmos - 3D canvas/sculpting
      return (
        <GLTFModel
          url="/3d-models/Meshy_AI_Enchanted_Cosmos_Code_0120111422_texture.glb"
          scale={0.5}
          dotsDensity={highDensity}
          {...commonProps}
        />
      )
    case 'EXPORT_SEC':
    case 'EXPORTER':
      // Predator of cosmos - export functionality
      return (
        <GLTFModel
          url="/3d-models/Meshy_AI_Predator_of_the_Cosmo_0120111442_texture.glb"
          scale={0.5}
          dotsDensity={highDensity}
          {...commonProps}
        />
      )
    case 'LOP_DES':
      // Oceanic cosmos predator - loop designer
      return (
        <GLTFModel
          url="/3d-models/Meshy_AI_Oceanic_Cosmos_Predat_0120111415_texture.glb"
          scale={0.5}
          dotsDensity={highDensity}
          {...commonProps}
        />
      )
    case 'STR_TST':
      // Realistic 14k - stress testing/simulation
      return (
        <GLTFModel
          url="/3d-models/Meshy_AI_Realistic_14k_textur_0120110958_texture.glb"
          scale={0.5}
          dotsDensity={highDensity}
          {...commonProps}
        />
      )
    case 'SEC_AST':
      // Fallback to enchanted cosmos code
      return (
        <GLTFModel
          url="/3d-models/Meshy_AI_Enchanted_Cosmos_Code_0120111422_texture.glb"
          scale={0.5}
          dotsDensity={highDensity}
          {...commonProps}
        />
      )
    default:
      return (
        <GLTFModel
          url="/3d-models/Meshy_AI_Generate_the_cosmos__0120111501_texture.glb"
          scale={0.5}
          dotsDensity={highDensity}
          {...commonProps}
        />
      )
  }
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
export function ThreeDIcon({
  type,
  size = 180,
  scale: propScale,
  offset = [0, 0],
  color,
  color,
  density,
  glowScale,
  distortion,
  speed,
  mouseRotation,
}: ThreeDIconProps & { speed?: number }) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  const scale = propScale ?? Math.max(1, size / 180)

  useEffect(() => {
    const loadThree = async () => {
      try {
        const [fiberModule, dreiModule] = await Promise.all([
          import('@react-three/fiber'),
          import('@react-three/drei'),
        ])
        Canvas = fiberModule.Canvas
        useFrame = fiberModule.useFrame
        useGLTF = dreiModule.useGLTF
        setIsLoaded(true)
      } catch (err) {
        console.error('Failed to load Three.js:', err)
        setHasError(true)
      }
    }
    loadThree()
  }, [])

  const mousePosition = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (!mouseRotation) return
    const handleMouseMove = (e: MouseEvent) => {
      mousePosition.current.x = (e.clientX / window.innerWidth) * 2 - 1
      mousePosition.current.y = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [mouseRotation])

  if (hasError) {
    return (
      <div
        className="flex items-center justify-center text-white/30"
        style={{ width: '100%', height: '100%' }}
      >
        <div className="w-12 h-12 border border-white/20 rounded-lg" />
      </div>
    )
  }

  if (!isLoaded || !Canvas) {
    return (
      <div className="flex items-center justify-center" style={{ width: '100%', height: '100%' }}>
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas
        camera={{ position: [0, 0, 1.1], fov: 50 }}
        style={{ background: 'transparent' }}
        gl={{ alpha: true, antialias: false, powerPreference: 'high-performance' }}
        dpr={1}
        frameloop="always"
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[2, 2, 2]} intensity={1} />
        <React.Suspense fallback={null}>
          <ScaleContext.Provider value={scale}>
            <MousePositionContext.Provider value={mousePosition}>
              <MouseRotationGroup intensity={mouseRotation}>
                <group position={[offset[0], offset[1], 0]}>
                  <IconScene type={type} density={density} glowScale={glowScale} distortion={distortion} speed={speed} />
                </group>
              </MouseRotationGroup>
            </MousePositionContext.Provider>
          </ScaleContext.Provider>
        </React.Suspense>
      </Canvas>
    </div>
  )
}
