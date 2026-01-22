# World Building Kit MCP Server

Model Context Protocol (MCP) server that exposes the World Building Toolkit's core services as tools for AI assistants and workflow bots.

---

## Key Features

| Feature             | Description                       | Preview                   |
| ------------------- | --------------------------------- | ------------------------- |
| **Writers Room**    | 13 AI agents collaborate on story | <!-- TODO: screenshot --> |
| **Tile Generation** | AI-powered world map tiles        | <!-- TODO: screenshot --> |
| **3D Pipeline**     | Text-to-3D model generation       | <!-- TODO: screenshot --> |
| **Game Loops**      | Market analysis + loop design     | <!-- TODO: screenshot --> |
| **Interior Design** | AI texture & room generation      | <!-- TODO: screenshot --> |
| **Bot Integration** | 22+ MCP tools for automation      | <!-- TODO: screenshot --> |

> **Note**: Add screenshots to `./assets/` folder: `writers-room.png`, `tile-generation.png`, `3d-pipeline.png`, `game-loops.png`, `interior-design.png`, `bot-integration.png`

---

## Two MCP Implementations

### 1. HTTP Endpoint (`/api/mcp`)

**JSON-RPC 2.0 over HTTP** - Stateless, web-accessible endpoint for external integrations.

```
POST https://your-domain.com/api/mcp
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": { "name": "get_bible", "arguments": { "projectId": "..." } },
  "id": 1
}
```

### 2. Stdio Server (`src/mcp/server.ts`)

**Standard I/O Transport** - For local AI assistants (Claude Desktop, Cursor).

```bash
npx tsx src/mcp/server.ts
```

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   REST API      │     │  MCP HTTP API   │     │  MCP Stdio      │
│  (Next.js API)  │     │  (/api/mcp)     │     │  (server.ts)    │
└───────┬─────────┘     └───────┬─────────┘     └───────┬─────────┘
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                │
                     ┌──────────▼──────────┐
                     │   Core Services     │
                     └──────────┬──────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          │                     │                     │
    ┌─────▼─────┐         ┌─────▼─────┐         ┌─────▼─────┐
    │ Trigger   │         │ Database  │         │ AI Agents │
    │ Tasks     │         │ (Supabase)│         │ (LangGraph)│
    └───────────┘         └───────────┘         └───────────┘
```

---

## HTTP MCP Tools (`/api/mcp`)

### Storyteller Domain

| Tool             | Description                                       |
| ---------------- | ------------------------------------------------- |
| `get_bible`      | Retrieve the series bible (lore, world rules).    |
| `get_characters` | Get all characters with psychological metrics.    |
| `get_episodes`   | List all episodes and chapters.                   |
| `get_beats`      | Get narrative beats (index cards) for an episode. |

### Loop Creator Domain

| Tool                  | Description                                  |
| --------------------- | -------------------------------------------- |
| `get_loops`           | Retrieve all game retention loops.           |
| `get_loop_by_id`      | Get full nodes/edges for a specific loop.    |
| `get_market_analysis` | Latest AI-driven market analysis for a loop. |

### World Building Domain

| Tool                   | Description                              |
| ---------------------- | ---------------------------------------- |
| `get_interior_designs` | Retrieve interior layouts and furniture. |
| `get_tiles`            | Get world grid tiles.                    |
| `get_assets`           | Retrieve exported 3D assets.             |
| `get_entities`         | Access the cross-domain entity bridge.   |

---

## Stdio MCP Tools (`src/mcp/server.ts`)

Organized by domain for scalability.

### Entities (5 tools) ✅

| Tool            | Description                       |
| --------------- | --------------------------------- |
| `list_entities` | List game entities with filtering |
| `get_entity`    | Get entity by ID                  |
| `create_entity` | Create new entity                 |
| `update_entity` | Update entity                     |
| `delete_entity` | Delete entity                     |

### Storyteller (9 tools) ✅

| Tool               | Description                   |
| ------------------ | ----------------------------- |
| `list_characters`  | List characters in project    |
| `get_character`    | Get character by ID           |
| `create_character` | Create new character          |
| `update_character` | Update character              |
| `delete_character` | Delete character              |
| `list_episodes`    | List episodes                 |
| `list_beats`       | List beats for episode        |
| `get_series_bible` | Get series bible content      |
| `storyteller_chat` | Chat with Writers Room agents |

### Generation (5 tools) ✅

| Tool                | Description                         |
| ------------------- | ----------------------------------- |
| `generate_tile`     | Generate a world tile (Trigger.dev) |
| `upscale_tile`      | Upscale a tile with Midjourney      |
| `generate_3d_model` | Generate a 3D model                 |
| `remesh_3d_model`   | Remesh/optimize a 3D model          |
| `generate_portrait` | Generate a character portrait       |

### Run Management (3 tools) ✅

| Tool             | Description                |
| ---------------- | -------------------------- |
| `get_run_status` | Check status of async task |
| `cancel_run`     | Cancel a running task      |
| `wait_for_run`   | Wait for task completion   |

### Loop Creator ❌ TODO

| Tool                  | Description               |
| --------------------- | ------------------------- |
| `get_loops`           | Retrieve all game loops   |
| `run_loop_planner`    | Invoke loop planner agent |
| `get_market_analysis` | Get market analysis       |

### Interior Designer ❌ TODO

| Tool                  | Description                |
| --------------------- | -------------------------- |
| `list_designs`        | List interior designs      |
| `generate_text_to_3d` | Generate 3D room from text |

### World Building ❌ TODO

| Tool             | Description          |
| ---------------- | -------------------- |
| `get_tiles`      | Read world grid data |
| `get_world_lore` | Access world lore    |

---

## Existing Agents & Tools

### Storyteller Agents (`/src/domains/storyteller/agents/`)

| Agent                         | File                           | Purpose                                       |
| ----------------------------- | ------------------------------ | --------------------------------------------- |
| **Supervisor**                | `supervisor.ts`                | Routes conversations, orchestrates agent flow |
| **Premise Architect**         | `premise-architect.ts`         | Creates story premises and core concepts      |
| **Episode Premise Architect** | `episode-premise-architect.ts` | Designs individual episode premises           |
| **Plot Architect**            | `plot-architect.ts`            | Structures plot beats and story arcs          |
| **Character Psychology**      | `character-psychology.ts`      | Develops character motivations                |
| **Devil's Advocate**          | `devils-advocate.ts`           | Challenges story decisions, finds plot holes  |
| **Consequence Tracker**       | `consequence-tracker.ts`       | Tracks cause-effect chains                    |
| **Consistency Agent**         | `consistency-agent.ts`         | Ensures story continuity                      |
| **Writer**                    | `writer.ts`                    | Generates script/prose content                |
| **Script Editor**             | `script-editor.ts`             | Refines and polishes content                  |
| **Magic Agent**               | `magic-agent.ts`               | Handles supernatural/magic system logic       |
| **Visual Moment**             | `visual-moment.ts`             | Identifies key visual moments                 |
| **World Simulator**           | `world-simulator.ts`           | Simulates world state changes                 |

### Loop Creator Agents (`/src/domains/loop-creator/agents/`)

| Agent                     | File                       | Purpose                         |
| ------------------------- | -------------------------- | ------------------------------- |
| **Supervisor**            | `supervisor.ts`            | Orchestrates game loop analysis |
| **Loop Planner**          | `loop-planner.ts`          | Designs core gameplay loops     |
| **Market Analyst**        | `market-analyst/index.ts`  | Full market research agent      |
| **Balance Analyst**       | `balance-analyst.ts`       | Analyzes game balance           |
| **Concept Evaluator**     | `concept-evaluator.ts`     | Evaluates game concepts         |
| **Mechanics Designer**    | `mechanics-designer.ts`    | Designs game mechanics          |
| **Progression Architect** | `progression-architect.ts` | Designs progression systems     |

### Trigger.dev Tasks (`/src/trigger/`)

| Task                  | File                     | Purpose                       |
| --------------------- | ------------------------ | ----------------------------- |
| `generate-tile`       | `generate-tile.ts`       | Generate world tiles with AI  |
| `upscale-tile`        | `upscale-tile.ts`        | Upscale tiles with Midjourney |
| `enhance-fidelity`    | `enhance-fidelity.ts`    | Enhance image fidelity        |
| `generate-portrait`   | `generate-portrait.ts`   | Generate character portraits  |
| `generate-moodboard`  | `generate-moodboard.ts`  | Generate project moodboards   |
| `generate-poster`     | `generate-poster.ts`     | Generate story posters        |
| `generate-storyboard` | `generate-storyboard.ts` | Generate storyboard images    |
| `generate-3d-model`   | `generate-3d-model.ts`   | Generate 3D models            |
| `remesh-3d-model`     | `remesh-3d-model.ts`     | Remesh/optimize 3D models     |
| `text-to-3d`          | `text-to-3d.ts`          | Text to 3D generation         |
| `retexture-model`     | `retexture-model.ts`     | Retexture 3D models           |
| `surface-material`    | `surface-material.ts`    | Generate surface materials    |

---

## Quick Start

### HTTP Endpoint

```bash
# Test the MCP endpoint
curl -X POST https://your-domain.com/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "id": 1
  }'
```

### Stdio Server (Claude Desktop / Cursor)

```json
{
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
}
```

### Development Mode

```bash
# Use dev-test-key for local development
export MCP_API_KEY=dev-test-key
export DEV_USER_ID="your-supabase-user-uuid"

# Run stdio server
npx tsx src/mcp/server.ts
```

---

## File Structure

```
src/
├── mcp/                           # Stdio MCP Server
│   ├── server.ts                  # Entry point
│   ├── core/                      # Core infrastructure
│   │   ├── auth.ts                # API key validation
│   │   ├── types.ts               # Shared types
│   │   └── index.ts
│   ├── domains/                   # Domain-based tools (SCALABLE)
│   │   ├── entities/tools.ts      # ✅ Cross-domain entity management
│   │   ├── storyteller/tools.ts   # ✅ Writers room, characters, episodes
│   │   ├── generation/tools.ts    # ✅ Tiles, 3D, portraits
│   │   ├── trigger/tools.ts       # ✅ Run management
│   │   ├── loop-creator/tools.ts  # ❌ TODO
│   │   ├── interior-designer/tools.ts # ❌ TODO
│   │   ├── world-building/tools.ts    # ❌ TODO
│   │   └── index.ts               # Domain registry
│   ├── resources/                 # Read-only resources
│   │   └── index.ts
│   ├── README.md                  # This file
│   └── DEVELOPER_GUIDE.md         # How to add new domains
│
├── infrastructure/mcp/            # HTTP MCP Server
│   ├── server.ts                  # JSON-RPC handler
│   ├── storyteller-tools.ts       # get_bible, get_characters, etc.
│   ├── loop-tools.ts              # get_loops, get_market_analysis
│   └── world-tools.ts             # get_tiles, get_entities, etc.
│
├── app/api/mcp/                   # HTTP endpoint
│   └── route.ts                   # POST /api/mcp
│
├── services/                      # Core Services (shared)
│   ├── entities.service.ts
│   ├── storyteller.service.ts
│   └── tiles.service.ts
│
├── domains/                       # Domain logic
│   ├── storyteller/
│   │   ├── agents/                # LangGraph agents
│   │   └── tools/                 # Agent tools
│   └── loop-creator/
│       └── agents/
│
└── trigger/                       # Trigger.dev tasks
    ├── generate-tile.ts
    ├── generate-portrait.ts
    └── ...
```

---

## Technical Details

| Spec           | HTTP MCP        | Stdio MCP     |
| -------------- | --------------- | ------------- |
| **Protocol**   | JSON-RPC 2.0    | MCP SDK       |
| **Transport**  | HTTP POST       | Standard I/O  |
| **Endpoint**   | `/api/mcp`      | Local process |
| **Auth**       | (add your auth) | API Key       |
| **Tracing**    | -               | LangSmith     |
| **Validation** | Zod             | Zod           |

---

## LangSmith Integration

All Stdio MCP tool calls are automatically traced in LangSmith:

```
Tags: [mcp, tool:name, key:api-key-name]
Metadata: { source: 'mcp', apiKeyId, toolName }
```

---

## Code Examples

### Bot Workflow: Create Character + Portrait

```typescript
async function createCharacterWithPortrait(mcp: MCPClient) {
  // Step 1: Create the character
  const { entity } = await mcp.callTool('create_character', {
    projectId: 'proj-123',
    name: 'Elena Vance',
    role: 'Lead',
    description: 'A determined detective with silver hair',
  })

  // Step 2: Trigger portrait generation
  const { runId } = await mcp.callTool('generate_portrait', {
    projectId: 'proj-123',
    characterId: entity.id,
  })

  // Step 3: Wait for completion
  const result = await mcp.callTool('wait_for_run', {
    runId,
    timeoutSeconds: 120,
  })

  return { character: entity, portrait: result }
}
```

### HTTP MCP: Get Series Bible

```typescript
const response = await fetch('/api/mcp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'get_bible',
      arguments: { projectId: 'your-project-uuid' },
    },
    id: 1,
  }),
})

const { result } = await response.json()
console.log(result.content[0].text) // Series bible JSON
```

---

## Adding New Domains

See `DEVELOPER_GUIDE.md` for detailed instructions on:

1. Creating a new domain folder
2. Implementing `MCPDomainModule`
3. Registering in the domain registry
4. Adding to both HTTP and Stdio implementations
