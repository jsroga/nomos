# World Building Kit MCP Server

This MCP (Model Context Protocol) server exposes the World Building Kit functionality to AI agents, bots, and workflows.

## Features

- **Game Entities**: CRUD operations for cross-domain game entities (characters, locations, mechanics, factions, items, quests)
- **Storyteller**: Characters, episodes, beats, series bible, and writers room chat
- **Tile Generation**: AI-powered tile generation via Trigger.dev
- **3D Models**: Text-to-3D model generation
- **Portraits**: Character portrait generation
- **Run Management**: Track and manage Trigger.dev task runs

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Create an API Key

Run the database migration to create the `mcp_api_keys` table:

```bash
npx supabase db push
```

Then create an API key via the API or directly in the database.

### 3. Configure Environment

Set the following environment variables:

```bash
# Required
MCP_API_KEY=wbk_your_api_key_here
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DATABASE_URL=your_database_url

# Optional (for development)
DEV_USER_ID=your_user_id  # For dev-test-key bypass
```

### 4. Run the Server

```bash
# Development
npm run mcp:dev

# Or directly
npx tsx src/mcp/server.ts
```

## Cursor/Claude Configuration

Add to your `.cursor/mcp.json`:

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

## Available Tools

### Entities
- `list_entities` - List game entities with filtering
- `get_entity` - Get a single entity
- `create_entity` - Create a new entity
- `update_entity` - Update an entity
- `delete_entity` - Delete an entity

### Storyteller
- `list_characters` - List all characters in a project
- `get_character` - Get a single character
- `create_character` - Create a new character
- `update_character` - Update a character
- `delete_character` - Delete a character
- `list_episodes` - List episodes in a project
- `list_beats` - List beats in an episode
- `get_series_bible` - Get the series bible
- `storyteller_chat` - Send a message to the writers room (LangGraph workflow)

### Generation (via Trigger.dev)
- `generate_tile` - Generate a tile image
- `upscale_tile` - Upscale a tile
- `generate_3d_model` - Generate a 3D model
- `remesh_3d_model` - Remesh a 3D model
- `generate_portrait` - Generate a character portrait

### Run Management
- `get_run_status` - Get status of a Trigger.dev run
- `cancel_run` - Cancel a running task
- `wait_for_run` - Wait for a run to complete

## Available Resources

- `wbk://projects` - List all projects
- `wbk://project/{projectId}/entities` - All entities in a project
- `wbk://project/{projectId}/characters` - All characters in a project
- `wbk://project/{projectId}/episodes` - All episodes in a project
- `wbk://project/{projectId}/series-bible` - Series bible for a project
- `wbk://episode/{episodeId}/beats` - All beats in an episode

## LangSmith Integration

All MCP tool calls are automatically traced in LangSmith with:

- `runName`: `MCP: {tool_name}`
- `tags`: `['mcp', 'tool:{name}', 'key:{api_key_name}']`
- `metadata`: API key ID, project ID, user ID, etc.

This allows you to:
- Filter all bot/workflow traffic by the `mcp` tag
- See nested traces (MCP → LangGraph → Agent → LLM)
- Track which API key triggered each run
- Compare MCP vs REST performance

## Security

- API keys are hashed (SHA-256) before storage
- Keys support scoped permissions (e.g., `entities:read`, `storyteller:*`)
- All requests are validated against the user's access rights
- RLS policies protect data at the database level

