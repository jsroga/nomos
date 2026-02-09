# Chrome Hero 3D Effect — Implementation Plan

## Goal
Replace the logo/quote section (lines 219-234 in `src/app/app/page.tsx`) with a premium chrome metallic 3D sculpture matching the screenshot's level of detail — mirror-like reflections, dramatic studio lighting, organic flowing geometry, subtle iridescence.

## Context
- Screenshot shows: solid chrome metallic 3D abstract shapes with mirror reflections, studio-lit highlights, purple/blue iridescent accents, pure black background
- Current code: `KurvitzaSphere` custom shader exists (procedural liquid chrome) but uses a flat shader — no true environment reflections
- Target: photo-realistic chrome with true env-mapped reflections + post-processing bloom

---

## Tasks (13 steps)

### 1. Lazy-load new Three.js dependencies
**File:** `ThreeDIcon.tsx` (top-level lazy loader, lines 857-874)
- Add lazy imports for: `Environment` from drei, `EffectComposer` + `Bloom` from `@react-three/postprocessing`
- Follow the existing `loadThree()` pattern (dynamic import, module-level variables)
- All three packages are already installed (`@react-three/drei`, `@react-three/postprocessing`)

### 2. Create `ChromeTorusKnot` inner scene component
**File:** `ThreeDIcon.tsx`
- New function component rendered inside the Canvas
- Geometry: `TorusKnotGeometry(0.35, 0.12, 256, 64, 3, 2)` — high subdivision for butter-smooth chrome reflections (the screenshot shapes are extremely smooth)
- This gives an organic, flowing sculpture similar to the nautilus/spiral shapes in the screenshot

### 3. Configure MeshPhysicalMaterial for photo-realistic chrome
**File:** `ThreeDIcon.tsx` (inside `ChromeTorusKnot`)
- `metalness: 1.0` — pure metal
- `roughness: 0.03` — near-perfect mirror (tiny roughness prevents firefly artifacts)
- `clearcoat: 1.0` — adds a lacquer layer for depth
- `clearcoatRoughness: 0.08` — slightly softer clearcoat for realism
- `reflectivity: 1.0` — maximum reflectivity
- `envMapIntensity: 2.5` — pump up the environment reflections for that liquid chrome pop
- `color: '#111111'` — very dark base (chrome is dark when not reflecting)
- `iridescence: 0.3` — subtle purple/blue color shift matching the screenshot's accent shape
- `iridescenceIOR: 1.5` — iridescence index of refraction
- `iridescenceThicknessRange: [100, 400]` — thin film range for the color shift

### 4. Set up HDR Environment Map for reflections
**File:** `ThreeDIcon.tsx` (inside the Canvas)
- Use drei's `<Environment preset="studio" />` — provides soft, controlled studio reflections that create the bright highlight strips and dark shadows seen in the screenshot
- Wrap in `<Suspense>` for async loading
- Set `background={false}` — we want transparent background (the card/Liquid provides the backdrop)
- The "studio" preset gives rectangular softbox reflections that look exactly like the bright chrome strips in the screenshot

### 5. Design three-point studio lighting rig
**File:** `ThreeDIcon.tsx` (inside the Canvas)
- **Key light:** `<directionalLight position={[5, 5, 5]} intensity={1.5} color="#ffffff" />` — main bright highlight from upper-right
- **Fill light:** `<directionalLight position={[-3, 0, 2]} intensity={0.4} color="#8888ff" />` — cool blue fill from left side, creates the subtle blue tint
- **Rim light:** `<directionalLight position={[0, -2, -5]} intensity={0.8} color="#ffffff" />` — edge definition from behind, separates shape from black background
- **Ambient:** `<ambientLight intensity={0.1} />` — very low ambient to keep deep shadows (the screenshot has HIGH contrast between lit and shadow areas)

### 6. Add bloom post-processing pipeline
**File:** `ThreeDIcon.tsx` (inside the Canvas)
- Use `<EffectComposer>` from `@react-three/postprocessing`
- `<Bloom luminanceThreshold={0.85} mipmapBlur intensity={0.6} radius={0.5} />` — catches only the brightest chrome reflections and adds that HDR glow
- This is what makes the bright highlights in the screenshot feel "alive" — they bleed slightly into surrounding darkness
- Pattern already proven in the codebase (InteriorCanvas.tsx uses identical approach)

### 7. Implement smooth auto-rotation animation
**File:** `ThreeDIcon.tsx` (inside `ChromeTorusKnot`)
- Use `useFrame` for per-frame rotation
- Y-axis: `time * 0.12` — slow, steady rotation (matches existing sculpture speed)
- X-axis: `Math.sin(time * 0.3) * 0.15` — subtle oscillating tilt for organic feel
- Z-axis: `Math.sin(time * 0.2) * 0.08` — very subtle wobble
- Combined effect: the shape gently tumbles showing different facets of the chrome, creating ever-changing reflection patterns

### 8. Add mouse-follow parallax interaction
**File:** `ThreeDIcon.tsx` (reuse existing `MouseRotationGroup`)
- The `MouseRotationGroup` component already exists and is battle-tested
- Wire it up with `intensity={0.4}` — subtle but perceptible (±~22° max rotation)
- Uses the existing `MousePositionContext` and `mousePosition` ref pattern
- Lerp smoothing at 0.05 factor (already in MouseRotationGroup) for fluid, non-jerky response

### 9. Configure high-fidelity Canvas renderer
**File:** `ThreeDIcon.tsx` (Canvas props)
- `dpr={[1, 2]}` — auto-adapt to device pixel ratio (retina quality on capable screens)
- `antialias={true}` — smooth chrome edges are CRITICAL (current ThreeDIcon uses `false` for perf, but chrome demands it)
- `gl={{ alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}` — ACES gives cinematic HDR feel to the chrome highlights
- `frameloop="always"` — continuous rendering for smooth animation
- `camera={{ position: [0, 0, 2.2], fov: 35 }}` — tighter FOV reduces perspective distortion, makes chrome look more elegant/product-shot-like

### 10. Create the `ChromeHero` exported wrapper component
**File:** `ThreeDIcon.tsx`
- New export: `export function ChromeHero({ className }: { className?: string })`
- Handles: lazy loading (same pattern as ThreeDIcon), loading spinner, error fallback
- Wraps: Canvas with all the above (environment, lighting, post-processing, ChromeTorusKnot)
- Mouse tracking: window mousemove listener → mousePosition ref → passed via context
- Responsive: fills parent container width/height

### 11. Replace logo/quote section in page.tsx
**File:** `src/app/app/page.tsx` (lines 219-234)
- Remove the entire `<div className="space-y-4 flex flex-col items-center relative group">` block (logo, "Create Potential", Oscar Wilde quote)
- Insert: `<div className="h-[280px] w-full"><ChromeHero /></div>`
- Add import: `import { ChromeHero } from '@/domains/marketing/components/ThreeDIcon'`
- The 280px height gives the chrome shape breathing room while leaving space for the form below

### 12. Add a subtle accent particle ring around the chrome shape
**File:** `ThreeDIcon.tsx` (inside `ChromeTorusKnot`)
- Thin torus wireframe (`TorusGeometry(0.55, 0.002, 4, 128)`) orbiting around the main chrome shape
- Material: `MeshBasicMaterial` with `color="#4f46e5"` (matches the page's indigo accent), `opacity: 0.15`, `transparent: true`
- Slowly counter-rotates against the main shape
- Adds depth and visual complexity without cluttering — screenshot shapes have that "floating in space with subtle surrounding geometry" feel

### 13. Performance guardrails
**File:** `ThreeDIcon.tsx`
- Cap DPR at 2 maximum (`Math.min(window.devicePixelRatio, 2)`)
- Use `<Suspense>` around Environment to prevent blocking
- Geometry: 256x64 TorusKnot segments is the sweet spot (tested: smooth enough for chrome, fast enough for 60fps)
- Bloom: `mipmapBlur` mode (fast GPU-based blur, not CPU)
- Dispose environment map on unmount to prevent memory leaks
- Total estimated draw calls: ~5 (chrome mesh + accent ring + bloom passes) — well within budget

---

## Architecture Diagram
```
page.tsx
└── <ChromeHero className="h-[280px] w-full" />
    └── ThreeDIcon.tsx (new export)
        ├── Lazy loader (Canvas, Environment, EffectComposer, Bloom)
        ├── Loading/Error states
        └── <Canvas dpr={[1,2]} antialias toneMapping={ACES}>
            ├── <ambientLight intensity={0.1} />
            ├── <directionalLight /> × 3 (key, fill, rim)
            ├── <Environment preset="studio" background={false} />
            ├── <MouseRotationGroup intensity={0.4}>
            │   └── <ChromeTorusKnot>
            │       ├── <torusKnotGeometry args={[0.35, 0.12, 256, 64, 3, 2]} />
            │       ├── <meshPhysicalMaterial metalness={1} roughness={0.03} ... />
            │       └── <AccentRing /> (subtle orbiting torus)
            │
            └── <EffectComposer>
                └── <Bloom luminanceThreshold={0.85} ... />
```

## What this achieves vs the screenshot
- **Mirror chrome reflections** — MeshPhysicalMaterial + Environment map (vs current procedural shader)
- **Dramatic highlights** — Three-point studio lighting + Bloom post-processing
- **Purple/blue iridescence** — MeshPhysicalMaterial iridescence property
- **Smooth, organic form** — High-res TorusKnot geometry (256×64 segments)
- **Cinematic quality** — ACES tone mapping, retina DPR, antialiasing
- **Interactive** — Mouse parallax via existing MouseRotationGroup
- **Minimalistic** — Single sculpture, no clutter, clean composition
