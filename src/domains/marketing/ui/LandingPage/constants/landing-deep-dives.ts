import type { FeatureDeepDiveConfig } from '@/domains/marketing/ui/LandingPage/types'

export const LANDING_DEEP_DIVES: FeatureDeepDiveConfig[] = [
  {
    index: 1,
    title: 'AI Storyteller',
    subtitle: 'NARRATIVE_ENGINE',
    description:
      'Factions. Intrigue. Betrayal. An AI co-writer that understands narrative arcs and character motivation, never sleeping, always plotting.',
    type3d: 'AI_NARRATIVE',
    modelScale: 3,
    modelOffsetX: -0.5,
    modelOffsetY: -0.2,
    glowScale: 0.5,
    density: 0.15,
    align: 'left',
    pngIcon: '/images/icons/ai-narrative.png',
  },
  {
    index: 2,
    title: 'Infinite Worlds',
    subtitle: 'PROCEDURAL_ENGINE',
    description:
      'Generate entire continents in milliseconds. Biomes, caves, cities—all procedurally crafted. The foundation of your reality, infinitely scalable.',
    type3d: 'WORLD_GEN',
    align: 'right',
    modelScale: 3,
    glowScale: 1,
    density: 45,
    pngIcon: '/images/icons/world-gen.png',
  },
  {
    index: 3,
    title: '3D Canvas',
    subtitle: 'SCULPT_SIMULATION',
    description:
      'Shape mountains and gouge trenches with real-time physics simulation. Drag, drop, sculpt. The most tactile terrain tool ever built.',
    type3d: 'SCULPT_SIM',
    align: 'left',
    modelScale: 2,
    density: 1.2,
    pngIcon: '/images/icons/sculpt-sim.png',
  },
  {
    index: 4,
    title: 'One-Click Export',
    subtitle: 'EXPORT_PIPELINE',
    description:
      'Unity. Unreal. Godot. GLTF. Zero friction pipeline from concept to production. Ship your worlds to any engine with a single click.',
    type3d: 'EXPORT_SEC',
    modelOffsetY: -0.3,
    modelOffsetX: -0.5,
    modelScale: 1,
    align: 'right',
    pngIcon: '/images/icons/export-sec.png',
  },
]
