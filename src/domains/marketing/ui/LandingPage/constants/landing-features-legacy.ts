import { Boxes, Brain, Flame, Map, Palette, Shield, Zap, type LucideIcon } from 'lucide-react'

export interface LegacyFeature {
  icon: LucideIcon
  title: string
  description: string
  accent: string
  code: string
  img: string
}

/** Legacy FEATURES / STEPS data — preserved for BrutalCard / unused step flows. */
export const LEGACY_FEATURES: LegacyFeature[] = [
  {
    icon: Map,
    title: 'Infinite Canvas',
    description: 'Infinite procedural terrain. Days → minutes. Ship-ready assets.',
    accent: '#5c7cfa',
    code: 'WLD_GEN',
    img: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80',
  },
  {
    icon: Brain,
    title: 'AI Storyteller',
    description: 'Quests, factions, arcs. AI co-writer. Always on.',
    accent: '#5c7cfa',
    code: 'NAR_SYS',
    img: 'https://images.unsplash.com/photo-1516414447565-b14be0adf13e?auto=format&fit=crop&w=600&q=80',
  },
  {
    icon: Palette,
    title: 'Terrain Sculpting',
    description: 'Mountains, rivers, dungeons. AI-assisted. Rapid iteration.',
    accent: '#5c7cfa',
    code: 'TER_SCL',
    img: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?auto=format&fit=crop&w=600&q=80',
  },
  {
    icon: Boxes,
    title: 'One-Click Export',
    description: 'Unity. Unreal. GLTF. Zero friction. Ship instantly.',
    accent: '#5c7cfa',
    code: 'EXP_SYS',
    img: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80',
  },
  {
    icon: Zap,
    title: 'Loop Designer',
    description: 'Data-driven mechanics. Addictive loops. Validated patterns.',
    accent: '#5c7cfa',
    code: 'LOP_DES',
    img: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80',
  },
  {
    icon: Flame,
    title: 'Scene Simulator',
    description: 'Combat. Physics. Chaos. Test before you code.',
    accent: '#5c7cfa',
    code: 'STR_TST',
    img: 'https://images.unsplash.com/photo-1614729375519-c61f9e511c6e?auto=format&fit=crop&w=600&q=80',
  },
  {
    icon: Shield,
    title: 'Team Collab',
    description: 'Secure storage. Role access. Any team size.',
    accent: '#5c7cfa',
    code: 'SEC_AST',
    img: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80',
  },
]

export interface LegacyStep {
  title: string
  subtitle: string
  description: string
  type3d: string
  stat: string
  statLabel: string
}

export const LEGACY_STEPS: LegacyStep[] = [
  {
    title: 'Generate',
    subtitle: 'PROCEDURAL_ENGINE',
    description:
      'Terrain generation from 3 weeks to 2 days. Infinite worlds, dungeons, environments.',
    type3d: 'GENERATOR',
    stat: '10x',
    statLabel: 'faster iteration',
  },
  {
    title: 'Evolve',
    subtitle: 'NEURAL_NARRATIVE',
    description:
      'Procedural tools that think like an artist, not an engineer. AI handles the filler.',
    type3d: 'NEURAL',
    stat: '40+',
    statLabel: 'hours saved/week',
  },
  {
    title: 'Ship',
    subtitle: 'EXPORT_PIPELINE',
    description: 'You write the quests that matter. One-click export to Unity, Unreal, Godot.',
    type3d: 'EXPORTER',
    stat: '300%',
    statLabel: 'more content',
  },
]
