# World Building Kit MCP API

Model Context Protocol (MCP) server exposing World Building Kit functionality for AI agents, bots, and workflows.

## Quick Start

```bash
# Install dependencies
npm install

# Run MCP server
npm run mcp:dev
```

Configure in `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "world-building-kit": {
      "command": "npx",
      "args": ["tsx", "src/mcp/server.ts"],
      "env": {
        "MCP_API_KEY": "your-api-key"
      }
    }
  }
}
```

---

## Tools Reference

### Entities (Cross-Domain)

Game entities that can be shared across storyteller, loop-creator, interior-designer, and world-building modules.

#### `list_entities`

List game entities for a project with optional filtering.

```typescript
// Input
{
  projectId: string      // Required - UUID
  entityType?: string    // character | location | mechanic | faction | item | quest
  sourceDomain?: string  // storyteller | loop-creator | interior-designer | world-building
  search?: string        // Search name/description
}

// Output
{
  entities: Array<{
    id: string
    name: string
    entity_type: string
    source_domain: string
    description: string | null
    metadata: object
    tags: string[]
    image_url: string | null
    created_at: string
  }>
}
```

#### `get_entity`

Get a single entity by ID.

```typescript
// Input
{
  entityId: string
}

// Output
{
  entity: Entity
}
```

#### `create_entity`

Create a new game entity.

```typescript
// Input
{
  projectId: string       // Required
  entityType: string      // Required - character | location | mechanic | faction | item | quest
  name: string            // Required
  sourceDomain: string    // Required - storyteller | loop-creator | interior-designer | world-building
  description?: string
  metadata?: object
  tags?: string[]
  imageUrl?: string
}

// Output
{ entity: Entity }
```

#### `update_entity`

Update an existing entity.

```typescript
// Input
{
  entityId: string        // Required
  name?: string
  description?: string
  metadata?: object
  tags?: string[]
  imageUrl?: string
}

// Output
{ entity: Entity }
```

#### `delete_entity`

Delete an entity.

```typescript
// Input
{
  entityId: string
}

// Output
{
  success: boolean
}
```

---

### Storyteller

Tools for interacting with the storyteller domain - characters, episodes, beats, and AI chat.

#### `list_characters`

List all characters in a project.

```typescript
// Input
{
  projectId: string
}

// Output
{
  characters: Array<{
    id: string
    name: string
    role: 'Lead' | 'Supporting' | 'Background'
    gender: string
    description: string
    portraitUrl: string
    mbti: string
    voiceSignature: string
    stressLevel: number // 0-100
    trustLevel: number // 0-100
    powerLevel: number // 0-100
    moralityLevel: number // 0-100
    hopeLevel: number // 0-100
    isolationLevel: number // 0-100
    transformationProgress: number // 0-100
  }>
}
```

#### `get_character`

Get a single character by ID.

```typescript
// Input
{
  characterId: string
}

// Output
{
  character: Character
}
```

#### `create_character`

Create a new character.

```typescript
// Input
{
  projectId: string       // Required
  name: string            // Required
  role?: string           // Lead | Supporting | Background (default: Supporting)
  gender?: string
  characterPrompt?: string
  description?: string
  mbti?: string           // MBTI type (e.g., INTJ, ENFP)
  voiceSignature?: string // How the character speaks
  stress?: number         // 0-100, default: 30
  trust?: number          // 0-100, default: 50
  power?: number          // 0-100, default: 30
  morality?: number       // 0-100, default: 50
  hope?: number           // 0-100, default: 60
  isolation?: number      // 0-100, default: 20
  transformation?: number // 0-100, default: 0
}

// Output
{ character: Character }
```

#### `update_character`

Update an existing character.

```typescript
// Input
{
  characterId: string     // Required
  name?: string
  role?: string
  gender?: string
  // ... all fields from create_character
}

// Output
{ character: Character }
```

#### `delete_character`

Delete a character.

```typescript
// Input
{
  characterId: string
}

// Output
{
  success: boolean
}
```

#### `list_episodes`

List all episodes in a project.

```typescript
// Input
{ projectId: string }

// Output
{ episodes: Episode[] }
```

#### `list_beats`

List all beats (story moments) in an episode.

```typescript
// Input
{ episodeId: string }

// Output
{ beats: Beat[] }
```

#### `get_series_bible`

Get the series bible containing world description, characters, factions, and story plan.

```typescript
// Input
{ projectId: string }

// Output
{
  seriesBible: {
    worldDescription: string
    keyCharacters: object[]
    factions: object[]
    storyPlan: object
    // ... more fields
  }
}
```

#### `storyteller_chat`

Send a message to the storyteller writers room. Invokes LangGraph multi-agent workflow.

```typescript
// Input
{
  projectId: string       // Required
  message: string         // Required - your message to the writers room
  threadId?: string       // For conversation continuity
  episodeId?: string      // Episode context
}

// Output
{
  response: {
    messages: Message[]
    actions: Action[]
    // ... graph state
  }
  threadId: string
}
```

**Note:** All `storyteller_chat` calls are traced in LangSmith with:

- `runName: "MCP: storyteller_chat"`
- `tags: ["mcp", "storyteller", "chat"]`
- Full metadata for debugging

---

### Generation (via Trigger.dev)

Async generation tasks. Returns immediately with a `runId` - use `get_run_status` to track progress.

#### `generate_tile`

Generate a tile image using AI.

```typescript
// Input
{
  projectId: string       // Required
  x: number               // Required - X coordinate
  y: number               // Required - Y coordinate
  prompt: string          // Required - what to generate
  aiProvider: string      // Required - gemini | openai | stability | midjourney
  isFirstTile?: boolean   // default: true
  styleReferenceUrls?: string[]
}

// Output
{
  runId: string           // Use with get_run_status
  status: "triggered"
  message: string
  publicAccessToken: string  // For realtime updates
}
```

#### `upscale_tile`

Upscale an existing tile to higher resolution.

```typescript
// Input
{
  projectId: string
  tileId: string
  upscaleProvider?: string  // midjourney | stability | topaz (default: midjourney)
}

// Output
{ runId: string, status: "triggered", ... }
```

#### `generate_3d_model`

Generate a 3D model from text.

```typescript
// Input
{
  projectId: string
  assetId: string
  prompt: string
}

// Output
{ runId: string, status: "triggered", ... }
```

#### `remesh_3d_model`

Remesh a 3D model to reduce polygon count.

```typescript
// Input
{
  projectId: string
  assetId: string
  targetPolycount?: number  // 100-100000
}

// Output
{ runId: string, status: "triggered", ... }
```

#### `generate_portrait`

Generate a character portrait.

```typescript
// Input
{
  projectId: string
  characterId: string
  prompt?: string
  style?: string
}

// Output
{ runId: string, status: "triggered", ... }
```

---

### Run Management

Track and manage Trigger.dev task runs.

#### `get_run_status`

Get the status of a Trigger.dev run.

```typescript
// Input
{ runId: string }  // starts with "run_"

// Output
{
  runId: string
  status: string   // PENDING | QUEUED | EXECUTING | COMPLETED | FAILED | CANCELED | ...
  output?: any     // Result when completed
  error?: string   // Error message if failed
  metadata?: object
  createdAt: string
  updatedAt: string
}
```

#### `cancel_run`

Cancel a running task.

```typescript
// Input
{
  runId: string
}

// Output
{
  success: boolean
}
```

#### `wait_for_run`

Wait for a run to complete (polling).

```typescript
// Input
{
  runId: string
  timeoutSeconds?: number     // 1-300, default: 60
  pollIntervalSeconds?: number // 1-30, default: 2
}

// Output
{
  runId: string
  status: string
  output?: any
  waitDurationMs: number
  timedOut: boolean
}
```

---

## Resources

Read-only data access via MCP resources.

| URI                                      | Description               |
| ---------------------------------------- | ------------------------- |
| `wbk://projects`                         | List all user's projects  |
| `wbk://project/{projectId}/entities`     | All entities in project   |
| `wbk://project/{projectId}/characters`   | All characters in project |
| `wbk://project/{projectId}/episodes`     | All episodes in project   |
| `wbk://project/{projectId}/series-bible` | Series bible              |
| `wbk://episode/{episodeId}/beats`        | All beats in episode      |

---

## LangSmith Integration

All MCP tool calls are traced in LangSmith:

- **Run Name**: `MCP: {tool_name}`
- **Tags**: `mcp`, `tool:{name}`, `key:{api_key_name}`
- **Metadata**: API key ID, project ID, user ID, tool name

Filter by `mcp` tag to see all bot/workflow traffic in LangSmith dashboard.

---

## Authentication

MCP uses API key authentication. Keys are stored hashed in `mcp_api_keys` table.

**Scopes:**

- `*` - Full access (default)
- `entities:read`, `entities:write` - Entity operations
- `storyteller:*` - All storyteller operations
- `generation:*` - All generation operations

**Development:** Use `MCP_API_KEY=dev-test-key` for local testing.

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│  Cursor/Claude  │     │   REST API      │
│   (MCP Client)  │     │  (Web App)      │
└────────┬────────┘     └────────┬────────┘
         │                       │
         ▼                       ▼
┌─────────────────────────────────────────┐
│           Service Layer                  │
│  entities.service | storyteller.service │
│           tiles.service                  │
└────────────────────┬────────────────────┘
                     │
         ┌───────────┼───────────┐
         ▼           ▼           ▼
┌─────────────┐ ┌─────────┐ ┌──────────┐
│  LangGraph  │ │Trigger  │ │ Supabase │
│   Agents    │ │  .dev   │ │    DB    │
└─────────────┘ └─────────┘ └──────────┘
```

---

## Error Handling

All errors return:

```typescript
{
  error: string      // Human-readable message
  code: string       // NOT_FOUND | UNAUTHORIZED | VALIDATION_ERROR | INTERNAL_ERROR
  details?: any      // Additional context
}
```
