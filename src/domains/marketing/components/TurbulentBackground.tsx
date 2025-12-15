'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

interface TurbulentBackgroundProps {
  children?: React.ReactNode
  zoom?: number
  rotation?: number
  colorShift?: number
  saturation?: number
  brightness?: number
  contrast?: number
  contrast?: number
  hue?: number
  onRef?: (el: HTMLDivElement | null) => void
}

const vertexShader = `
  varying vec2 vUv;
  
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = `
  uniform float uTime;
  uniform vec2 uResolution;
  uniform float uZoom;
  uniform float uRotation;
  uniform float uSpeed;
  uniform float uMorphSpeed;
  uniform float uColorShift;
  uniform float uSaturation;
  uniform float uBrightness;
  uniform float uContrast;
  uniform float uHue;
  varying vec2 vUv;

  // Simplex 2D noise
  vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
             -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0 ))
    + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
      dot(x12.zw,x12.zw)), 0.0);
    m = m*m;
    m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x  = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  // Ridged Noise - creates sharp peaks/valleys
  float ridge(vec2 p) {
    // 1.0 - abs(noise) creates sharp ridges
    return 1.0 - abs(snoise(p));
  }

  // HIGH DETAIL FBM - 5 octaves
  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    
    // Increased to 5 octaves for fine detail
    for(int i = 0; i < 5; i++) {
        value += amplitude * snoise(p * frequency);
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    return value;
  }
  
  // RIDGED FBM - For the "veins" of the fluid
  float ridgedFbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    float prev = 1.0;
    
    for(int i = 0; i < 4; i++) {
        float n = ridge(p * frequency);
        // Sharpen the ridges
        n = n * n * n;
        value += n * amplitude * prev;
        prev = n;
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    return value;
  }

  // Complex Domain Warping
  vec2 domainWarp(vec2 p, float time) {
    vec2 q = vec2(
      fbm(p + vec2(0.0, 0.0) + time * 0.1),
      fbm(p + vec2(5.2, 1.3) + time * 0.1)
    );
    
    vec2 r = vec2(
      fbm(p + 4.0*q + vec2(1.7, 9.2) + time * 0.15),
      fbm(p + 4.0*q + vec2(8.3, 2.8) + time * 0.12)
    );
    
    // Extra warp layer for extreme fluidity
    return p + 1.5 * r;
  }

  // NEON ON BLACK - High Contrast Palette
  vec3 getColor(float t) {
    t = fract(t);
    
    // Base colors - Ultra Dark / Premium
    vec3 deepVoid = vec3(0.0);                  // Pure black
    vec3 midnight = vec3(0.02, 0.02, 0.05);     // Almost black blue
    vec3 royalPurple = vec3(0.15, 0.1, 0.25);   // Very dark, desaturated purple
    vec3 oceanBlue = vec3(0.1, 0.2, 0.3);       // Dark slate
    vec3 softTeal = vec3(0.1, 0.3, 0.3);        // Dark teal
    vec3 starlight = vec3(0.7, 0.7, 0.8);       // Muted silver/white (only for highest peaks)
    
    // Map noise to colors with a "Black Hole" threshold
    // 0.0 - 0.3: Deep Void (Black)
    // 0.3 - 1.0: Vibrant Fluid
    
    vec3 color;
    if(t < 0.35) {
      // The massive void - smooth transition
      color = mix(deepVoid, midnight, smoothstep(0.0, 0.35, t));
    } else if(t < 0.55) {
      color = mix(midnight, royalPurple, smoothstep(0.35, 0.55, t));
    } else if(t < 0.7) {
      color = mix(royalPurple, oceanBlue, smoothstep(0.55, 0.7, t));
    } else if(t < 0.85) {
      color = mix(oceanBlue, softTeal, smoothstep(0.7, 0.85, t));
    } else {
      color = mix(softTeal, starlight, smoothstep(0.85, 1.0, t));
    }
    
    return color;
  }

  // RGB to HSV conversion
  vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
  }

  // HSV to RGB conversion
  vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }

  void main() {
    vec2 uv = vUv;
    
    // Apply rotation
    vec2 center = vec2(0.5);
    vec2 rotated = uv - center;
    float angle = uRotation;
    mat2 rotation = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    rotated = rotation * rotated;
    rotated += center;
    
    // Apply zoom - Base scale adjusted for higher detail
    vec2 p = (rotated - 0.5) * uZoom;
    p.x *= uResolution.x / uResolution.y;
    
    // HIGH DETAIL WARPING
    // Speed controlled by separate uniform for organic reshaping
    vec2 warped = domainWarp(p * 1.5, uTime * uMorphSpeed * 0.1);
    
    // Main ridged pattern
    float n = ridgedFbm(warped * 2.0);
    
    // Base cloudiness
    // Flow speed controlled by uSpeed (movement across screen)
    float base = fbm(warped * 0.8 - uTime * uSpeed * 0.05);
    
    // Combine sharp ridges with soft base
    n = mix(base, n, 0.7);
    
    // Normalize roughly to 0-1
    n = clamp(n, 0.0, 1.0);
    
    // Contrast curve for "Liquid Glass" look
    n = pow(n, 1.2); 
    
    // Map to Neon-Void Color Palette
    float colorIndex = n + length(warped)*0.2 + uColorShift + uTime * uMorphSpeed * 0.05;
    vec3 color = getColor(colorIndex);
    
    // BLACK VOID PRESERVATION
    float voidMask = smoothstep(0.3, 0.55, n);
    color *= voidMask;
    
    // Apply saturation
    float luminance = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(vec3(luminance), color, uSaturation);
    
    // Hue shift
    vec3 hsv = rgb2hsv(color);
    hsv.x = fract(hsv.x + uHue);
    color = hsv2rgb(hsv);
    
    // Brightness Control
    color *= 1.5 * uBrightness;
    
    // Ultra-sharp highlights on the ridges
    float ridgeHighlight = smoothstep(0.8, 0.95, n);
    color += vec3(1.0) * ridgeHighlight * 0.8;
    
    // Contrast
    color = (color - 0.5) * uContrast + 0.5;
    
    // Vignette
    float vignette = 1.0 - length(uv - 0.5) * 0.4;
    color *= vignette;
    
    // Filmic tone mapping
    vec3 x = max(vec3(0.0), color - 0.004);
    color = (x * (6.2 * x + 0.5)) / (x * (6.2 * x + 1.7) + 0.06);
    
    gl_FragColor = vec4(color, 1.0);
  }
`

export function TurbulentBackground({
  children,
  zoom = 0.1,
  rotation = 2.02,
  speed = 1.0,  // Flow speed
  morphSpeed = 0.5, // Reshape speed
  colorShift = 0,
  saturation = 0.65,
  brightness = 2.39,
  contrast = 1.32,
  hue = 0,
  onRef
}: TurbulentBackgroundProps & { speed?: number, morphSpeed?: number }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null)
  const materialRef = useRef<THREE.ShaderMaterial | null>(null)
  const frameIdRef = useRef<number | null>(null)

  // Expose ref to parent
  useEffect(() => {
    if (onRef) {
      onRef(containerRef.current)
    }
  }, [onRef])

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const width = window.innerWidth
    const height = window.innerHeight

    // Setup renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: false, // Disable for performance
      alpha: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true // Required for html2canvas/liquidGL to capture it
    })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)) // Cap at 2x for performance
    renderer.domElement.id = 'turbulent-bg-canvas' // Add ID for liquidGL capture
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Setup scene
    const scene = new THREE.Scene()
    sceneRef.current = scene

    // Setup orthographic camera for full-screen effect
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    cameraRef.current = camera

    // Create shader material
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(width, height) },
        uZoom: { value: zoom },
        uRotation: { value: rotation },
        uColorShift: { value: colorShift },
        uSaturation: { value: saturation },
        uBrightness: { value: brightness },
        uContrast: { value: contrast },
        uHue: { value: hue },
        uSpeed: { value: speed },
        uMorphSpeed: { value: morphSpeed }
      },
      vertexShader,
      fragmentShader,
      depthWrite: false,
      depthTest: false
    })
    materialRef.current = material

    // Create full-screen quad
    const geometry = new THREE.PlaneGeometry(2, 2)
    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    // Animation loop
    let startTime = Date.now()
    const animate = () => {
      // Pass elapsed time directly - multiplication happens in shader
      const elapsed = (Date.now() - startTime) * 0.001

      if (materialRef.current) {
        materialRef.current.uniforms.uTime.value = elapsed
      }

      renderer.render(scene, camera)
      frameIdRef.current = requestAnimationFrame(animate)
    }

    animate()

    // Handle resize
    const handleResize = () => {
      const newWidth = window.innerWidth
      const newHeight = window.innerHeight

      renderer.setSize(newWidth, newHeight)

      if (materialRef.current) {
        materialRef.current.uniforms.uResolution.value.set(newWidth, newHeight)
      }
    }

    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)

      if (frameIdRef.current !== null) {
        cancelAnimationFrame(frameIdRef.current)
      }

      if (rendererRef.current) {
        container.removeChild(rendererRef.current.domElement)
        rendererRef.current.dispose()
      }

      if (materialRef.current) {
        materialRef.current.dispose()
      }

      geometry.dispose()
    }
  }, [])

  // Update uniforms when props change
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uZoom.value = zoom
      materialRef.current.uniforms.uRotation.value = rotation
      materialRef.current.uniforms.uColorShift.value = colorShift
      materialRef.current.uniforms.uSaturation.value = saturation
      materialRef.current.uniforms.uBrightness.value = brightness
      materialRef.current.uniforms.uContrast.value = contrast
      materialRef.current.uniforms.uHue.value = hue
      materialRef.current.uniforms.uSpeed.value = speed
      materialRef.current.uniforms.uMorphSpeed.value = morphSpeed
    }
  }, [zoom, rotation, colorShift, saturation, brightness, contrast, hue, speed, morphSpeed])

  return (
    <div className="relative w-full min-h-screen overflow-hidden">
      <div id="turbulent-bg-container" ref={containerRef} className="fixed inset-0" style={{ zIndex: -1 }} />
      <div className="relative z-10">{children}</div>
    </div>
  )
}
