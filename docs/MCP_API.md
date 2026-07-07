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

## Architecture

The MCP server provides two implementations:

### 1. HTTP Endpoint (`/api/mcp`)
**JSON-RPC 2.0 over HTTP** - Stateless, web-accessible endpoint for external integrations (e.g., custom bots, webhooks).

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

### System Overview

```
src/
├── mcp/                           # Stdio MCP Server
│   ├── server.ts                  # Entry point
│   ├── core/                      # Core infrastructure
│   ├── domains/                   # Domain-based tools (SCALABLE)
│   │   ├── entities/tools.ts      # Cross-domain entity management
│   │   ├── storyteller/tools.ts   # Writers room, characters
│   │   ├── generation/tools.ts    # Tiles, 3D, portraits
│   │   ├── trigger/tools.ts       # Run management
│   │   └── index.ts               # Domain registry
│   └── resources/                 # Read-only resources
│
├── infrastructure/mcp/            # HTTP MCP Server
│   ├── server.ts                  # JSON-RPC handler
│   └── ...tools.ts                # Tool definitions
│
├── services/                      # Core Services (Business Logic)
│   ├── entities.service.ts
│   └── ...
```

---

## Tools Reference

### Entities (Cross-Domain)

Game entities (characters, locations, items, etc.) shared across modules.

*   `list_entities`: List game entities with filtering.
*   `get_entity`: Get a single entity by ID.
*   `create_entity`: Create a new game entity.
*   `update_entity`: Update an existing entity.
*   `delete_entity`: Delete an entity.

### Storyteller

Tools for the writers room, characters, and episodes.

*   `list_characters`: List all characters.
*   `get_character`: Get character details.
*   `create_character`: Create a new character.
*   `update_character`: Update character traits/stats.
*   `delete_character`: Delete a character.
*   `list_episodes`: List all episodes.
*   `list_beats`: List beats for an episode.
*   `get_series_bible`: Get world rules and story plan.
*   `storyteller_chat`: Chat with the AI Writers Room (Mastra agent + SSE stream).

### Generation (Async via Trigger.dev)

Long-running generation tasks. These return a `runId` immediately.

*   `generate_tile`: Generate world map tiles.
*   `upscale_tile`: Upscale tiles (Midjourney/Stability).
*   `generate_3d_model`: Text-to-3D generation.
*   `remesh_3d_model`: Optimize 3D models.
*   `generate_portrait`: Generate character portraits.

Use `get_run_status` to check progress.

### Run Management

*   `get_run_status`: Check Trigger.dev task status.
*   `cancel_run`: Cancel a running task.
*   `wait_for_run`: Poll and wait for completion.

---

## Resources

Read-only data access via MCP resources.

| URI | Description |
| :--- | :--- |
| `wbk://projects` | List all user's projects |
| `wbk://project/{projectId}/entities` | All entities in project |
| `wbk://project/{projectId}/characters` | All characters in project |
| `wbk://project/{projectId}/series-bible` | Series bible content |

---

## Developer Guide

### Adding a New Domain

1.  **Create Domain Folder**: `mkdir -p src/mcp/domains/<your-domain>`
2.  **Create `tools.ts`**:
    *   Define tools using `Tool` type.
    *   Implement handlers using `MCPDomainModule`.
3.  **Register in `src/mcp/domains/index.ts`**.

### Service Layer Pattern

**Rule: Never put business logic directly in MCP tools.**

1.  **Service**: Create `src/services/<domain>.service.ts`.
2.  **Schema**: Define Zod schemas for inputs.
3.  **Use**: Call the service from both MCP tools and Next.js API routes.

### Integrations

*   **Mastra observability**: MCP tool calls inherit Mastra AI tracing when the app Mastra instance has storage configured (`MastraStorageExporter`).
*   **Trigger.dev**: Use `tasks.trigger()` in services for long-running jobs.

---

## Authentication

*   **HTTP**: Custom auth (e.g., Session/NextAuth).
*   **Stdio**: API Key (`MCP_API_KEY`).
