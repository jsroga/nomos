# MCP Developer Guide

This guide explains how to add new MCP functionality and integrate existing services.

---

## Architecture Overview

```
src/mcp/
├── core/                     # Core MCP infrastructure
│   ├── auth.ts              # API key validation
│   ├── types.ts             # Shared types (MCPServiceContext, LangSmithContext)
│   └── index.ts             # Core exports
├── domains/                  # Domain-specific tools (SCALABLE)
│   ├── entities/            # Cross-domain entity management
│   │   └── tools.ts
│   ├── storyteller/         # Storyteller domain
│   │   └── tools.ts
│   ├── generation/          # Tile/3D/Portrait generation
│   │   └── tools.ts
│   ├── trigger/             # Trigger.dev run management
│   │   └── tools.ts
│   ├── loop-creator/        # Game loop design (TODO)
│   │   └── tools.ts
│   ├── interior-designer/   # Interior design (TODO)
│   │   └── tools.ts
│   ├── world-building/      # World generation (TODO)
│   │   └── tools.ts
│   └── index.ts             # Domain registry & aggregation
├── resources/               # Read-only MCP resources
│   └── index.ts
├── server.ts                # MCP server entry point
├── README.md                # Usage documentation
└── DEVELOPER_GUIDE.md       # This file
```

---

## Domain Completeness Checklist

| Domain            | Status      | Tools | Service Layer |
| ----------------- | ----------- | ----- | ------------- |
| entities          | ✅ Complete | 5     | ✅            |
| storyteller       | ✅ Complete | 9     | ✅            |
| generation        | ✅ Complete | 5     | ✅            |
| trigger           | ✅ Complete | 3     | ✅            |
| loop-creator      | ❌ TODO     | 0     | ❌            |
| interior-designer | ❌ TODO     | 0     | ❌            |
| world-building    | ❌ TODO     | 0     | ❌            |

---

## Adding a New Domain

### Step 1: Create Domain Folder

```bash
mkdir -p src/mcp/domains/<your-domain>
```

### Step 2: Create tools.ts

Every domain must export a default `MCPDomainModule`:

```typescript
// src/mcp/domains/<your-domain>/tools.ts

import { Tool } from '@modelcontextprotocol/sdk/types.js'
import { MCPDomainModule, MCPServiceContext, LangSmithContext } from '../../core/types'
import { yourService } from '@/services'

// ============================================
// TOOL DEFINITIONS
// ============================================

const tools: Tool[] = [
  {
    name: 'your_tool_name',
    description: 'What this tool does',
    inputSchema: {
      type: 'object',
      properties: {
        param1: {
          type: 'string',
          description: 'Parameter description',
        },
      },
      required: ['param1'],
    },
  },
]

// ============================================
// HANDLERS
// ============================================

const handlers: Record<
  string,
  (
    args: Record<string, any>,
    context: MCPServiceContext,
    langsmith: LangSmithContext
  ) => Promise<any>
> = {
  your_tool_name: async (args, context, langsmith) => {
    return yourService.doSomething(args, { userId: context.userId })
  },
}

// ============================================
// EXPORT MODULE
// ============================================

const yourDomainModule: MCPDomainModule = {
  tools,
  handlers,
}

export default yourDomainModule
```

### Step 3: Register in domains/index.ts

```typescript
// src/mcp/domains/index.ts

import yourDomainModule from './your-domain/tools'

const domainModules: Record<string, MCPDomainModule> = {
  // ... existing domains
  'your-domain': yourDomainModule,
}
```

That's it! The server automatically picks up all registered domains.

---

## Creating a Service Layer

**Rule: Never put business logic directly in MCP tools or REST routes.**

### Step 1: Create Service File

```typescript
// src/services/your-domain.service.ts

import { db } from '@/db'
import { z } from 'zod'

// ============================================
// SCHEMAS
// ============================================

export const doSomethingSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1),
})

export type DoSomethingInput = z.infer<typeof doSomethingSchema>

// ============================================
// SERVICE CONTEXT
// ============================================

export interface YourServiceContext {
  userId: string
  supabase?: SupabaseClient
}

// ============================================
// SERVICE CLASS
// ============================================

export class YourDomainService {
  async doSomething(input: DoSomethingInput, context: YourServiceContext) {
    const validated = doSomethingSchema.parse(input)

    // Your business logic here
    const result = await db.query...

    return result
  }
}

export const yourDomainService = new YourDomainService()
```

### Step 2: Export from services/index.ts

```typescript
// src/services/index.ts

export * from './your-domain.service'
export { yourDomainService } from './your-domain.service'
```

### Step 3: Use in Both MCP and REST

**MCP Tool:**

```typescript
your_tool_name: async (args, context) => {
  return yourDomainService.doSomething(args, { userId: context.userId })
}
```

**REST Route:**

```typescript
export async function POST(req: NextRequest) {
  const session = await getSession()
  const body = await req.json()

  const result = await yourDomainService.doSomething(body, {
    userId: session.user.id,
  })

  return NextResponse.json(result)
}
```

---

## LangSmith Integration

All MCP tool calls are automatically traced. For LangGraph workflows, pass the langsmith context:

```typescript
storyteller_chat: async (args, context, langsmith) => {
  const enhancedLangsmith: LangSmithContext = {
    runName: langsmith.runName || `MCP: storyteller_chat`,
    tags: [...(langsmith.tags || []), 'your-domain', 'specific-operation'],
    metadata: {
      ...langsmith.metadata,
      projectId: args.projectId,
      customField: args.customField,
    },
  }

  return yourService.invokeLangGraph(args, context, enhancedLangsmith)
}
```

In your service, pass to LangGraph:

```typescript
import { RunnableConfig } from '@langchain/core/runnables'

async invokeLangGraph(input, context, langsmith: LangSmithContext) {
  const config: RunnableConfig = {
    runName: langsmith.runName,
    tags: langsmith.tags,
    metadata: langsmith.metadata,
  }

  const graph = await getYourGraph()
  return graph.invoke(input, config)
}
```

---

## Trigger.dev Integration

For long-running tasks, trigger a Trigger.dev task and return immediately:

```typescript
generate_something: async (args, context) => {
  const handle = await tasks.trigger('your-task-id', {
    projectId: args.projectId,
    // ... payload
  })

  return {
    runId: handle.id,
    status: 'TRIGGERED',
    message: 'Use get_run_status to track progress',
  }
}
```

---

## Adding MCP to an Existing REST-Only Feature

1. **Identify the route**: e.g., `src/app/api/your-feature/route.ts`
2. **Extract logic to service**: Move business logic to `src/services/your-feature.service.ts`
3. **Update route**: Call service instead of inline logic
4. **Create MCP tool**: Add tool in appropriate domain's `tools.ts`

---

## Converting MCP Tool to REST Endpoint

If you find a tool that needs a REST endpoint:

1. **Find the service** it calls in the handler
2. **Create route** in `src/app/api/...`
3. **Add auth**: Use `withAuth` or session validation
4. **Call service**: Same as MCP handler

---

## Testing

### Test MCP Locally

```bash
# Set environment
export MCP_API_KEY=dev-test-key
export DEV_USER_ID=your-user-uuid

# Run server
npx tsx src/mcp/server.ts
```

### Test with Cursor/Claude

Add to your MCP config:

```json
{
  "mcpServers": {
    "world-building-kit": {
      "command": "npx",
      "args": ["tsx", "/path/to/src/mcp/server.ts"],
      "env": {
        "MCP_API_KEY": "your-api-key"
      }
    }
  }
}
```

---

## Common Patterns

### Input Validation

Always use Zod schemas defined in the service layer:

```typescript
// In service
export const createItemSchema = z.object({...})

// In MCP handler
create_item: async (args, context) => {
  // Service will validate
  return yourService.createItem(args, context)
}
```

### Error Handling

Throw `ServiceError` from services:

```typescript
import { ServiceError } from '@/services'

if (!hasPermission) {
  throw new ServiceError('Not authorized', 'FORBIDDEN', 403)
}
```

MCP server automatically catches and formats errors.

### Scoped API Keys

Check scopes before executing:

```typescript
import { hasScope } from '../core/auth'

delete_item: async (args, context) => {
  if (!hasScope(context, 'items:delete')) {
    throw new Error('API key does not have delete permission')
  }
  return yourService.deleteItem(args, context)
}
```

---

## Quick Reference

| Task                 | Location                                       |
| -------------------- | ---------------------------------------------- |
| Add new tool         | `src/mcp/domains/<domain>/tools.ts`            |
| Add new domain       | Create folder + register in `domains/index.ts` |
| Business logic       | `src/services/<domain>.service.ts`             |
| Auth utilities       | `src/mcp/core/auth.ts`                         |
| Shared types         | `src/mcp/core/types.ts`                        |
| LangGraph invocation | Pass `LangSmithContext` to service             |
| Trigger.dev tasks    | Use `tasks.trigger()` in service               |
