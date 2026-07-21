/**
 * Canvas module catalog — the infinite canvas is a host for modules, each on the
 * Mastra/OpenRouter/assistant-ui convention (see PLATFORM-ROADMAP.md Track C).
 *
 * `chatAgentId` is a Mastra agent id reachable via `/api/assistant/<agentId>`
 * (assistant-ui). `modelRole` is the admin model slot (`model_settings.role`)
 * the module's agent reads. Enable/placement is overridden per admin
 * `module_settings` in roadmap A2.
 */

export interface CanvasModuleDef {
  key: string
  label: string
  description: string
  /** Mastra agent id for this module's assistant-ui chat, if any. */
  chatAgentId?: string
  /**
   * Custom assistant-ui chat endpoint. Overrides the default
   * `/api/assistant/<chatAgentId>` — used when the module streams an
   * orchestration rather than a single agent (e.g. the loop-creator crew).
   */
  chatApiPath?: string
  /** Admin model slot (model_settings role) the module's agent resolves. */
  modelRole?: string
  /** Default enabled state (overridable via admin module_settings). */
  enabledByDefault: boolean
}

export const CANVAS_MODULES: readonly CanvasModuleDef[] = [
  {
    key: 'loop-creator',
    label: 'Loop Creator',
    description: 'Game-loop design canvas (React Flow) — supervisor + specialist crew.',
    chatAgentId: 'loopCreatorSupervisor',
    // Full crew orchestration (streamLoopCreator), not the single supervisor agent.
    chatApiPath: '/api/loop-creator/assistant',
    modelRole: 'loop-creator',
    enabledByDefault: true,
  },
  {
    key: 'game-design',
    label: 'Game Design',
    description: 'Game-design agent + loop workflow.',
    chatAgentId: 'gameDesign',
    modelRole: 'game-design',
    enabledByDefault: true,
  },
  {
    key: 'storyteller-corkboard',
    label: 'Story Corkboard',
    description: 'Beat / storyboard planning canvas.',
    chatAgentId: 'storyteller',
    modelRole: 'chat',
    enabledByDefault: true,
  },
  {
    key: 'character-web',
    label: 'Character Web',
    description: 'Character relationship graph (React Flow).',
    chatAgentId: 'storyteller',
    modelRole: 'chat',
    enabledByDefault: true,
  },
  {
    key: 'world-building',
    label: 'World Builder',
    description: 'Tile-based world canvas — image/3D via Trigger.dev (no agent).',
    enabledByDefault: true,
  },
]
