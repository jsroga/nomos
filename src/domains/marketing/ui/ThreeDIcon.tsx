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
type IconType =
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
  frequency?: number
  contrast?: number
  twist?: number
  metalness?: number
  /** Adds a black vignette overlay fading from transparent center to black edges */
  vignette?: boolean
}

// Scale context
const ScaleContext = React.createContext(1)

// Mouse position context for passing mouse data into Canvas
const MousePositionContext = React.createContext<React.RefObject<{ x: number; y: number }> | null>(
  null
)

function MouseRotationGroup({
  children,
  intensity = 0,
}: {
  children: React.ReactNode
  intensity?: number
}) {
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
// ═══════════════════════════════════════════════════════════════════
// KURVITZA LIQUID CHROME SHADER
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// KURVITZA "IQ 200" LIQUID CHROME SHADER
// ═══════════════════════════════════════════════════════════════════

const kurvitzaVertexShader = `
  uniform float u_time;
  uniform float u_distortion;
  uniform float u_frequency;
  uniform float u_twist;
  uniform float u_speed;
  
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying float vDisplacement;
  
  // ------------------------------------------------------------------
  // ASHIMA & WEBGL-NOISE (Simplex 3D with Derivatives)
  // We need derivatives to calculate the NEW normal after distortion
  // ------------------------------------------------------------------
  
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  
  // Calculate Simplex Noise and its 3D Gradient (Derivatives)
  // Returns vec4(noise value, gradient.x, gradient.y, gradient.z)
  vec4 snoise_grad(vec3 v) {
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
    
    // First corner
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 = v - i + dot(i, C.xxx) ;
    
    // Other corners
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );
    
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    
    // Permutations
    i = mod289(i); 
    vec4 p = permute( permute( permute( 
               i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
             + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
             + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
             
    // Gradients: 7x7 points over a square, mapped onto an octahedron.
    float n_ = 0.142857142857; // 1.0/7.0
    vec3  ns = n_ * D.wyz - D.xzx;
    
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z); 
    
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );  
    
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    
    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );
    
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
    
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    
    // Normalise gradients
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    
    // Mix final noise value
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    vec4 m2 = m * m;
    vec4 m4 = m2 * m2;
    
    vec4 pdotx = vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3));
    
    // Determine noise value
    float n = 42.0 * dot(m4, pdotx);
    
    // Determine gradient (This is the "IQ" magic part)
    // The gradient of the noise is needed to offset the normal correctly
    // For simplicity in this implementation, we will use a Finite Difference approximation
    // in the main function as analytical 4D derivatives are extremely expensive.
    // However, getting the raw noise is the first step.
    
    return vec4(n, 0.0, 0.0, 0.0); // Placeholder for gradient if we went full analytical
  }
  
  // Rotation matrix
  mat2 rotate(float a) {
    float s = sin(a);
    float c = cos(a);
    return mat2(c, -s, s, c);
  }
  
  // Distortion Function - ENHANCED ANIMATION
  // Returns displaced position with dramatic morphing
  vec3 distort(vec3 p) {
    // FLOWER / VORTEX TWIST ALGORITHM - ENHANCED
    
    // Time-based animation factors
    float time = u_time * u_speed * 1.2; // 20% faster
    float pulse = sin(time * 0.5) * 0.5 + 0.5; // Pulsing 0-1
    float breathe = sin(time * 0.3) * 0.3 + 1.0; // Breathing 0.7-1.3
    
    // 1. Convert to polar coordinates in XZ plane
    float r = length(p.xz);
    float a = atan(p.z, p.x);
    
    // 2. Enhanced Twist calculation with oscillation
    float twistAmount = u_twist * (1.0 - r * 2.0) * breathe; // Breathing twist
    float rotAngle = a + twistAmount * sin(time);
    
    // 3. Flower/Petal shape with secondary wave
    float petals = 6.0 + sin(time * 0.2) * 2.0; // Morphing petal count 4-8
    float petalShape = sin(rotAngle * petals + p.y * 4.0);
    float secondaryWave = sin(rotAngle * 3.0 - time * 2.0) * 0.5; // Counter-rotating wave
    
    // 4. DOUBLED Radial displacement with animation
    float animatedDistortion = u_distortion * (1.0 + pulse * 1.0); // 100% more at peak
    float displacement = (petalShape + secondaryWave) * animatedDistortion * (1.0 - r);
    
    // 5. Apply enhanced displacement
    vec3 newPos = p;
    
    // Rotate the point based on the animated twist
    mat2 rot = rotate(twistAmount);
    newPos.xz = rot * newPos.xz;
    
    // Push out along the normal with breathing effect
    newPos += normalize(p) * displacement * breathe;
    
    return newPos;
  }

  void main() {
    vUv = uv;
    vec3 pos = position;
    
    // --------------------------------------------------------
    // ANALYTICAL NORMAL RECALCULATION
    // Use epsilon offsets to find the tangent/bitangent of the distorted surface
    // This allows lighting to flow perfectly over the distorted waves
    // --------------------------------------------------------
    float epsilon = 0.001;
    vec3 distortedPos = distort(pos);
    
    vec3 tangent = distort(pos + vec3(epsilon, 0.0, 0.0)) - distortedPos;
    vec3 bitangent = distort(pos + vec3(0.0, epsilon, 0.0)) - distortedPos;
    
    // The new normal is perpendicular to the surface tangent/bitangent
    vec3 newNormal = normalize(cross(tangent, bitangent));
    
    vNormal = normalMatrix * newNormal;
    vDisplacement = length(distortedPos - pos); // Store for coloring
    vViewPosition = (modelViewMatrix * vec4(distortedPos, 1.0)).xyz;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(distortedPos, 1.0);
  }
`

const kurvitzaFragmentShader = `
  uniform float u_time;
  uniform float u_speed;
  uniform vec3 u_color;
  uniform float u_metalness;
  uniform float u_contrast;
  
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying float vDisplacement;
  
  // Standard noise functions for pattern generation
  float random(vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123); }
  float noise(vec2 st) {
    vec2 i = floor(st); vec2 f = fract(st);
    float a = random(i); float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0)); float d = random(i + vec2(1.0, 1.0));
    vec2 u = f*f*(3.0-2.0*f);
    return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }
  
  // Domain Warping FBM
  float fbm(vec2 st) {
    float v = 0.0; float a = 0.5;
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.50));
    for (int i = 0; i < 4; ++i) { // Reduced octaves for perf
      v += a * noise(st); st = rot * st * 2.0; a *= 0.5;
    }
    return v;
  }

  void main() {
    vec3 viewDir = normalize(-vViewPosition);
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(vec3(1.0, 2.0, 1.0)); // Key light
    
    // --------------------------------------------------------
    // 1. PROCEDURAL STUDIO ENVIRONMENT (MatCap-ish)
    // Simulate a "Softbox" reflection for that liquid chrome look
    // --------------------------------------------------------
    vec3 ref = reflect(-viewDir, normal);
    
    // Create a "horizon" line and some vertical strip lights
    float horizon = smoothstep(0.0, 0.05, abs(ref.y)); 
    float strips = smoothstep(0.95, 1.0, sin(ref.x * 10.0 + ref.y * 5.0));
    
    // Sky/Ground gradient
    vec3 envColor = mix(vec3(0.05), vec3(0.35), ref.y * 0.5 + 0.5);
    envColor += vec3(1.0, 1.0, 1.2) * strips * u_metalness; // Bright strips
    
    // --------------------------------------------------------
    // 2. MAGNETIC INTERFERENCE PATTERN
    // --------------------------------------------------------
    // Use view-space coordinates mixed with UVs for "holographic" feel
    vec2 p = vUv * 3.0 + viewDir.xy * 0.2;
    float flow = u_time * u_speed;
    
    // Heavy domain warping
    float q = fbm(p + flow * 0.1);
    float r = fbm(p + q + flow * 0.2);
    
    // The "Kurvitza" Equation: Sharp, magnetic lines
    // sin(warped_pos) -> abs() -> pow() creates sharp ridges
    float lines = sin((r * 15.0) + flow);
    lines = pow(abs(lines), u_contrast); // Sharpen
    
    // --------------------------------------------------------
    // 3. COMPOSITION - MATTE METAL LOOK
    // --------------------------------------------------------
    vec3 baseColor = vec3(0.03); // Slightly lighter for matte
    vec3 tintColor = u_color;    // Interference Purple/Blue
    
    // Diffuse Lighting - Essential for matte look
    float diffuse = max(dot(normal, lightDir), 0.0);
    float diffuse2 = max(dot(normal, normalize(vec3(-1.0, 0.5, 0.5))), 0.0); // Fill light
    
    // Rim Light (Fresnel) - Softer for matte
    float fresnel = pow(1.0 - dot(viewDir, normal), 2.0); // Reduced exponent
    
    // Specular Highlight - Much softer for matte metal
    float spec = pow(max(dot(reflect(-lightDir, normal), viewDir), 0.0), 8.0); // Wider, softer
    
    // Brushed metal grain
    float grain = noise(vUv * 50.0 + normal.xy * 10.0) * 0.08;
    
    // Final Mix - Matte emphasis on diffuse, reduced specular
    vec3 color = mix(baseColor, tintColor, lines * 0.6 + grain); // Pattern + grain
    color += diffuse * tintColor * 0.3; // Diffuse tint
    color += diffuse2 * vec3(0.15); // Fill light
    color += envColor * (0.1 + fresnel * 0.2) * (1.0 - u_metalness * 0.5); // Reduced reflection
    color += spec * 0.25 * u_metalness; // Soft specular
    
    // Post-process contrast
    color = pow(color, vec3(1.1));
    
    gl_FragColor = vec4(color, 1.0);
  }
`

function KurvitzaSphere({
  position = [0, 0, 0] as [number, number, number],
  radius = 0.12,
  color = '#a855f7',
  distortion = 0.4,
  speed = 1,
  frequency = 1.0,
  contrast = 4.0, // High sharpness by default
  twist = 0.5,
  metalness = 0.8,
  glowScale = 1.0,
}: {
  position?: [number, number, number]
  radius?: number
  color?: string
  distortion?: number
  speed?: number
  frequency?: number
  contrast?: number
  twist?: number
  metalness?: number
  glowScale?: number
}) {
  const meshRef = useRef<THREE.Mesh>(null)

  const uniforms = useMemo(
    () => ({
      u_time: { value: 0 },
      u_distortion: { value: distortion },
      u_speed: { value: speed },
      u_frequency: { value: frequency },
      u_twist: { value: twist },
      u_contrast: { value: contrast },
      u_metalness: { value: metalness },
      u_color: { value: new THREE.Color(color) },
    }),
    [color] // Re-create if color prop changes mainly. Other updates via useFrame/refs usually better for simple floats but this is safe.
  )

  useFrame(state => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.ShaderMaterial
      material.uniforms.u_time.value = state.clock.elapsedTime
      material.uniforms.u_distortion.value = distortion
      material.uniforms.u_speed.value = speed
      material.uniforms.u_frequency.value = frequency
      material.uniforms.u_twist.value = twist
      material.uniforms.u_contrast.value = contrast
      material.uniforms.u_metalness.value = metalness
      material.uniforms.u_color.value.set(color)

      // Gentle rotation base - respects speed prop
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.1 * speed
      meshRef.current.rotation.z = state.clock.elapsedTime * 0.05 * speed
    }
  })

  return (
    <group position={position}>
      {/* Key forces recreation when radius changes - R3F geometry args are NOT reactive */}
      <mesh ref={meshRef} key={`sphere-${radius}`}>
        {/* ULTRA High resolution geometry for smooth analytical normals */}
        <icosahedronGeometry args={[radius, 32]} />
        <shaderMaterial
          fragmentShader={kurvitzaFragmentShader}
          vertexShader={kurvitzaVertexShader}
          uniforms={uniforms}
          // wireframe={true} // Debug
        />
      </mesh>

      {/* Reduced Halo, subtle glass reflection layer */}
      {/* Reduced Halo, subtle glass reflection layer */}
      <mesh
        scale={1.0 + Math.pow(Math.max(0, glowScale), 3) * 0.2}
        key={`halo-${radius}-${glowScale}`}
      >
        <sphereGeometry args={[radius, 32, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.05 * Math.pow(Math.max(0, glowScale), 2)}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
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
  distortion?: number
  speed?: number
}

function GLTFModel({
  url,
  scale = 1,
  dotsColor = '#ffffff',
  dotsDensity = 0.25,
  glowScale = 1,
  distortion = 0,
  speed = 2,
  includeSphere = true,
}: GLTFModelProps & { includeSphere?: boolean }) {
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
      {includeSphere && (
        <KurvitzaSphere
          position={[0.2, 0.1, 0.3]}
          radius={0.15 * glowScale}
          distortion={distortion}
          speed={speed}
        />
      )}
    </group>
  )
}

/**
 * Wrapper component for using GLTF models - call this from your code
 */
function GLTFIcon({ url, size = 180, ...props }: GLTFModelProps & { size?: number }) {
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
      <KurvitzaSphere position={[0.4, 0.3, 0.2]} radius={0.12} />
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
      <KurvitzaSphere position={[0, 0, 0.18]} radius={0.1} />
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
      <KurvitzaSphere position={[0.25, 0.2, 0.25]} radius={0.1} />
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
      <KurvitzaSphere position={[0, 0, 0]} radius={0.1} />
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
      <KurvitzaSphere position={[0.3, 0.12, 0.18]} radius={0.1} />
    </group>
  )
}

function StrTstSculpture({
  density,
  distortion,
  speed,
  frequency,
  contrast,
  twist,
  metalness,
}: {
  density?: number
  distortion?: number
  speed?: number
  frequency?: number
  contrast?: number
  twist?: number
  metalness?: number
}) {
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
      // Rotation respects speed prop (speed=0 means no rotation)
      const effectiveSpeed = speed ?? 0.1
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.2 * effectiveSpeed
    }
  })

  return (
    <group ref={groupRef}>
      {geometries.map((geo, i) => (
        <PointCloudDots key={i} geometry={geo} color="#FFFFFF" density={density ?? 2.5} />
      ))}
      <KurvitzaSphere
        position={[0, 0, 0]}
        radius={0.024}
        distortion={distortion ?? 0.25}
        speed={speed ?? 0.1}
        frequency={frequency ?? 0.8}
        contrast={contrast}
        twist={twist}
        metalness={metalness}
      />
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
      <KurvitzaSphere position={[0, 0, 0.12]} radius={0.1} />
    </group>
  )
}

// ═══════════════════════════════════════════════════════════════════
// ICON SCENE WRAPPER - Using GLB models from public/3d-models
// ═══════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════
// ICON SCENE WRAPPER - Using GLB models from public/3d-models
// ═══════════════════════════════════════════════════════════════════
function IconScene({
  type,
  density,
  glowScale,
  distortion,
  speed,
  frequency,
  contrast,
  twist,
  metalness,
  color,
  scale = 0.5,
}: {
  type: string
  density?: number
  glowScale?: number
  distortion?: number
  speed?: number
  frequency?: number
  contrast?: number
  twist?: number
  metalness?: number
  color?: string
  scale?: number
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
    scale, // Pass the scale prop
  }

  switch (type) {
    case 'WORLD_GEN':
    case 'GENERATOR':
      // Cosmos generation - perfect for world building
      return (
        <GLTFModel
          url="/3d-models/Meshy_AI_Generate_the_cosmos__0120111501_texture.glb"
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
          dotsDensity={lowDensity}
          {...commonProps}
        />
      )
    case 'SCULPT_SIM':
      // Enchanted code cosmos - 3D canvas/sculpting
      return (
        <GLTFModel
          url="/3d-models/Meshy_AI_Enchanted_Cosmos_Code_0120111422_texture.glb"
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
          dotsDensity={highDensity}
          {...commonProps}
        />
      )
    case 'LOP_DES':
      // Oceanic cosmos predator - loop designer
      return (
        <GLTFModel
          url="/3d-models/Meshy_AI_Oceanic_Cosmos_Predat_0120111415_texture.glb"
          dotsDensity={highDensity}
          {...commonProps}
        />
      )
    case 'STR_TST':
      // Realistic 14k - stress testing/simulation
      // Pure Kurvitza Sphere for maximum shader effect
      return (
        <group scale={scale}>
          {/* Background High Density Model */}
          <GLTFModel
            url="/3d-models/Meshy_AI_Realistic_14k_textur_0120110958_texture.glb"
            dotsDensity={density ?? highDensity}
            dotsColor={color}
            includeSphere={false}
            {...commonProps}
            scale={1} // Override scale from commonProps since we apply it to the parent group
          />
          {/* Liquid Chrome Core - Random position each render */}
          <KurvitzaSphere
            position={[
              (Math.random() - 0.5) * 0.3,
              (Math.random() - 0.5) * 0.3,
              (Math.random() - 0.5) * 0.2,
            ]}
            radius={0.065 * Math.max(0.3, (glowScale ?? 1) * 2.5)}
            distortion={(distortion ?? 0.08) * Math.max(0.3, (glowScale ?? 1) * 2.5)} // Low for sculptural look
            speed={speed ?? 0.15} // Slow, elegant rotation
            frequency={frequency ?? 3.0} // Larger, cleaner patterns
            contrast={contrast ?? 6.0} // Sharp, defined chrome lines
            twist={twist ?? 3.0} // Dramatic flower petal twist
            metalness={metalness ?? 0.95} // High chrome reflection
            glowScale={(glowScale ?? 1) * 0.2}
          />
        </group>
      )
    case 'SEC_AST':
      // Fallback to enchanted cosmos code
      return (
        <GLTFModel
          url="/3d-models/Meshy_AI_Enchanted_Cosmos_Code_0120111422_texture.glb"
          dotsDensity={highDensity}
          {...commonProps}
        />
      )
    default:
      return (
        <GLTFModel
          url="/3d-models/Meshy_AI_Generate_the_cosmos__0120111501_texture.glb"
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
  density,
  glowScale,
  distortion,
  speed,
  mouseRotation,
  frequency,
  contrast,
  twist,
  metalness,
  vignette = false,
}: ThreeDIconProps) {
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

  // Vignette style: Use CSS Masking to fade edges to transparent
  // This is superior to box-shadow for "fading out" effectively
  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    position: 'relative',
    ...(vignette
      ? {
          WebkitMaskImage: 'radial-gradient(circle at center, black 30%, transparent 70%)',
          maskImage: 'radial-gradient(circle at center, black 30%, transparent 70%)',
        }
      : {}),
  }

  return (
    <div style={containerStyle}>
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
                  <IconScene
                    type={type}
                    density={density}
                    glowScale={glowScale}
                    distortion={distortion}
                    speed={speed}
                    frequency={frequency}
                    contrast={contrast}
                    twist={twist}
                    metalness={metalness}
                    scale={scale} // Pass the calculated scale here
                  />
                </group>
              </MouseRotationGroup>
            </MousePositionContext.Provider>
          </ScaleContext.Provider>
        </React.Suspense>
      </Canvas>
    </div>
  )
}
