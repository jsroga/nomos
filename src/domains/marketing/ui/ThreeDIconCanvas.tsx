'use client'

import React, { useRef, useMemo, useContext } from 'react'
import { Canvas, useFrame, type RootState } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { BufferGeometryAttribute } from '@/shared/three/constants/buffer-geometry-attribute'
import {
  MarketingIconType,
  MarketingThreeDColor,
  MarketingThreeDModelPath,
} from '@/domains/marketing/constants/three-d-icon'

interface ThreeDIconCanvasProps {
  type: string
  scale: number
  offset: [number, number]
  density?: number
  glowScale?: number
  mouseRotation?: number
  distortion?: number
  speed?: number
  frequency?: number
  contrast?: number
  twist?: number
  metalness?: number
  mousePosition: React.RefObject<{ x: number; y: number }>
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
  const mouseRef = useContext(MousePositionContext)
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
  position = [0, 0, 0] satisfies [number, number, number],
  radius = 0.12,
  color = MarketingThreeDColor.KurvitzaDefault,
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

  useFrame((state: { clock: { elapsedTime: number } }) => {
    if (meshRef.current) {
      const material = meshRef.current.material
      if (!(material instanceof THREE.ShaderMaterial)) return
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
  color = MarketingThreeDColor.White,
  density = 1.5,
}: {
  geometry: THREE.BufferGeometry
  color?: string
  density?: number
}) {
  const pointsData = useMemo(() => geometryToPoints(geometry, density), [geometry, density])

  const pointsGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute(BufferGeometryAttribute.Position, new THREE.BufferAttribute(pointsData.positions, 3))
    geo.setAttribute(BufferGeometryAttribute.Size, new THREE.BufferAttribute(pointsData.sizes, 1))
    geo.setAttribute(
      BufferGeometryAttribute.Brightness,
      new THREE.BufferAttribute(pointsData.brightnesses, 1)
    )
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

  useFrame((state: RootState) => {
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
  dotsColor = MarketingThreeDColor.White,
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

    gltf.scene.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh && child.geometry) {
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

  useFrame((state: RootState) => {
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
    case MarketingIconType.WorldGen:
    case MarketingIconType.Generator:
      return (
        <GLTFModel
          url={MarketingThreeDModelPath.Cosmos}
          dotsDensity={highDensity}
          {...commonProps}
        />
      )
    case MarketingIconType.AiNarrative:
    case MarketingIconType.Neural:
      return (
        <GLTFModel
          url={MarketingThreeDModelPath.NeuralConnections}
          dotsDensity={lowDensity}
          {...commonProps}
        />
      )
    case MarketingIconType.SculptSim:
      return (
        <GLTFModel
          url={MarketingThreeDModelPath.EnchantedCosmosCode}
          dotsDensity={highDensity}
          {...commonProps}
        />
      )
    case MarketingIconType.ExportSec:
    case MarketingIconType.Exporter:
      return (
        <GLTFModel
          url={MarketingThreeDModelPath.PredatorCosmos}
          dotsDensity={highDensity}
          {...commonProps}
        />
      )
    case MarketingIconType.LoopDes:
      return (
        <GLTFModel
          url={MarketingThreeDModelPath.OceanicCosmos}
          dotsDensity={highDensity}
          {...commonProps}
        />
      )
    case MarketingIconType.StrTst:
      return (
        <group scale={scale}>
          <GLTFModel
            url={MarketingThreeDModelPath.Realistic14k}
            dotsDensity={density ?? highDensity}
            dotsColor={color}
            includeSphere={false}
            {...commonProps}
            scale={1}
          />
          <KurvitzaSphere
            position={[
              (Math.random() - 0.5) * 0.3,
              (Math.random() - 0.5) * 0.3,
              (Math.random() - 0.5) * 0.2,
            ]}
            radius={0.065 * Math.max(0.3, (glowScale ?? 1) * 2.5)}
            distortion={(distortion ?? 0.08) * Math.max(0.3, (glowScale ?? 1) * 2.5)}
            speed={speed ?? 0.15}
            frequency={frequency ?? 3.0}
            contrast={contrast ?? 6.0}
            twist={twist ?? 3.0}
            metalness={metalness ?? 0.95}
            glowScale={(glowScale ?? 1) * 0.2}
          />
        </group>
      )
    case MarketingIconType.SecAst:
      return (
        <GLTFModel
          url={MarketingThreeDModelPath.EnchantedCosmosCode}
          dotsDensity={highDensity}
          {...commonProps}
        />
      )
    default:
      return (
        <GLTFModel
          url={MarketingThreeDModelPath.Cosmos}
          dotsDensity={highDensity}
          {...commonProps}
        />
      )
  }
}

// MAIN CANVAS COMPONENT
// ═══════════════════════════════════════════════════════════════════
export function ThreeDIconCanvas({
  type,
  scale,
  offset,
  density,
  glowScale,
  distortion,
  speed,
  mouseRotation,
  frequency,
  contrast,
  twist,
  metalness,
  mousePosition,
}: ThreeDIconCanvasProps) {
  return (
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
                  scale={scale}
                />
              </group>
            </MouseRotationGroup>
          </MousePositionContext.Provider>
        </ScaleContext.Provider>
      </React.Suspense>
    </Canvas>
  )
}
