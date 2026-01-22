'use client'

import { motion } from 'framer-motion'
import { Shield, Zap, Code, Terminal, CheckCircle, Circle } from 'lucide-react'

const DOMAIN_STATUS = [
  {
    domain: 'Entities',
    status: 'complete',
    tools: [
      { name: 'list_entities', desc: 'List game entities with filtering by type/domain.' },
      { name: 'get_entity', desc: 'Get a single entity by ID.' },
      { name: 'create_entity', desc: 'Create a new game entity.' },
      { name: 'update_entity', desc: 'Update an existing entity.' },
      { name: 'delete_entity', desc: 'Delete an entity.' },
    ],
  },
  {
    domain: 'Storyteller',
    status: 'complete',
    tools: [
      { name: 'list_characters', desc: 'List all characters in a project.' },
      { name: 'get_character', desc: 'Get character by ID with psychology metrics.' },
      { name: 'create_character', desc: 'Create a new character with MBTI and voice signature.' },
      { name: 'update_character', desc: 'Update character attributes.' },
      { name: 'delete_character', desc: 'Delete a character.' },
      { name: 'list_episodes', desc: 'List all episodes in a project.' },
      { name: 'list_beats', desc: 'Get narrative beats for an episode.' },
      { name: 'get_series_bible', desc: 'Retrieve the series bible (lore, world rules).' },
      { name: 'storyteller_chat', desc: 'Chat with the Writers Room LangGraph agents.' },
    ],
  },
  {
    domain: 'Generation',
    status: 'complete',
    tools: [
      { name: 'generate_tile', desc: 'Generate a world tile with AI (Trigger.dev task).' },
      { name: 'upscale_tile', desc: 'Upscale tile with Midjourney.' },
      { name: 'generate_3d_model', desc: 'Generate 3D model from text.' },
      { name: 'remesh_3d_model', desc: 'Remesh/optimize a 3D model.' },
      { name: 'generate_portrait', desc: 'Generate a character portrait.' },
    ],
  },
  {
    domain: 'Trigger.dev',
    status: 'complete',
    tools: [
      { name: 'get_run_status', desc: 'Check status of async generation tasks.' },
      { name: 'cancel_run', desc: 'Cancel a running task.' },
      { name: 'wait_for_run', desc: 'Wait for task completion with timeout.' },
    ],
  },
  {
    domain: 'Loop Creator',
    status: 'todo',
    tools: [
      { name: 'get_loops', desc: 'Retrieve all game retention loops.' },
      { name: 'run_loop_planner', desc: 'Invoke the loop planner agent.' },
      { name: 'get_market_analysis', desc: 'Get AI market analysis for a loop.' },
    ],
  },
  {
    domain: 'Interior Designer',
    status: 'todo',
    tools: [
      { name: 'list_designs', desc: 'List interior design layouts.' },
      { name: 'generate_text_to_3d', desc: 'Generate 3D room from description.' },
    ],
  },
  {
    domain: 'World Building',
    status: 'todo',
    tools: [
      { name: 'get_tiles', desc: 'Read world grid data.' },
      { name: 'get_world_lore', desc: 'Access world lore and rules.' },
    ],
  },
]

export default function McpPage() {
  return (
    <div className="space-y-12">
      <header>
        <span className="text-[10px] font-mono text-primary uppercase tracking-widest mb-2 block">
          [EXTERNAL_INTEGRATION]
        </span>
        <h1 className="text-5xl font-black uppercase tracking-tighter font-syne text-white">
          MCP Server
        </h1>
        <p className="mt-4 text-white/50 text-xl font-light max-w-2xl">
          Connect your AI agents directly to the World Building Toolkit using the Model Context
          Protocol.
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          {
            title: 'Native Integration',
            desc: 'Directly expose toolkit capabilities to Claude, ChatGPT, and other LLMs.',
            icon: Shield,
          },
          {
            title: 'Real-time Context',
            desc: 'Allow AI to read and write directly to your game world bible and designs.',
            icon: Zap,
          },
          {
            title: 'Tool Suite',
            desc: 'Exposes specialized tools for terrain sculpting, lore writing, and market analysis.',
            icon: Terminal,
          },
          {
            title: 'Secure Access',
            desc: 'Fine-grained permissions for tools and resources via API keys.',
            icon: Code,
          },
        ].map((feature, i) => (
          <div
            key={i}
            className="p-8 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-primary/20 transition-all"
          >
            <feature.icon className="w-10 h-10 text-primary mb-6" />
            <h3 className="text-xl font-bold text-white mb-2 font-syne uppercase">
              {feature.title}
            </h3>
            <p className="text-white/40 font-mono text-sm leading-relaxed">{feature.desc}</p>
          </div>
        ))}
      </section>

      <section className="bg-black/40 border border-white/5 rounded-3xl p-10">
        <h2 className="text-2xl font-black uppercase tracking-tight font-syne mb-6 text-white">
          Available Tools
        </h2>
        <div className="space-y-8">
          {DOMAIN_STATUS.map(group => (
            <div key={group.domain}>
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-primary font-mono text-xs uppercase tracking-widest">
                  {group.domain}
                </h3>
                {group.status === 'complete' ? (
                  <span className="flex items-center gap-1 text-green-400 text-[10px] font-mono uppercase">
                    <CheckCircle className="w-3 h-3" />
                    Complete
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-yellow-400/60 text-[10px] font-mono uppercase">
                    <Circle className="w-3 h-3" />
                    Coming Soon
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {group.tools.map(tool => (
                  <div
                    key={tool.name}
                    className={`p-4 rounded-xl border ${
                      group.status === 'complete'
                        ? 'bg-white/5 border-white/5'
                        : 'bg-white/[0.02] border-white/[0.03] opacity-60'
                    }`}
                  >
                    <div className="font-mono text-xs font-bold text-white mb-1 tracking-tight">
                      {tool.name}
                    </div>
                    <div className="text-[10px] text-white/40">{tool.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-black/40 border border-white/5 rounded-3xl p-10">
        <h2 className="text-2xl font-black uppercase tracking-tight font-syne mb-6 text-white">
          Connection Details
        </h2>
        <div className="grid gap-6">
          <div>
            <span className="text-xs font-mono text-white/30 uppercase block mb-2">Transport</span>
            <div className="flex items-center gap-4 bg-black p-4 rounded-xl border border-white/5 font-mono text-sm">
              <span className="text-primary">STDIO</span>
              <span className="text-white/60">Standard Input/Output (launched on demand)</span>
            </div>
          </div>
          <div>
            <span className="text-xs font-mono text-white/30 uppercase block mb-2">
              Claude Desktop / Cursor Configuration
            </span>
            <pre className="bg-black p-4 rounded-xl border border-white/5 font-mono text-xs text-white/40 overflow-x-auto">
              {`{
  "mcpServers": {
    "world-building-kit": {
      "command": "npx",
      "args": ["tsx", "/path/to/tilemap/src/mcp/server.ts"],
      "env": {
        "MCP_API_KEY": "your-api-key",
        "NEXT_PUBLIC_SUPABASE_URL": "...",
        "SUPABASE_SERVICE_ROLE_KEY": "..."
      }
    }
  }
}`}
            </pre>
          </div>
          <div>
            <span className="text-xs font-mono text-white/30 uppercase block mb-2">
              Development Mode
            </span>
            <pre className="bg-black p-4 rounded-xl border border-white/5 font-mono text-xs text-white/40 overflow-x-auto">
              {`# Use dev-test-key for local development
export MCP_API_KEY=dev-test-key
export DEV_USER_ID="your-supabase-user-uuid"

# Run the server
npx tsx src/mcp/server.ts`}
            </pre>
          </div>
        </div>
      </section>

      <section className="bg-primary/5 border border-primary/20 rounded-3xl p-10">
        <h2 className="text-2xl font-black uppercase tracking-tight font-syne mb-4 text-white">
          LangSmith Tracing
        </h2>
        <p className="text-white/50 font-mono text-sm mb-6">
          All MCP tool calls are automatically traced in LangSmith with rich metadata including API
          key, tool name, and execution context.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {['tool:name', 'key:name', 'source:mcp', 'domain:tag'].map(tag => (
            <div key={tag} className="bg-black/40 px-4 py-2 rounded-lg text-center">
              <span className="font-mono text-xs text-primary">{tag}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
