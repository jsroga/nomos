# Mastra Architecture Plan for Storyteller

## Current State Analysis

### Problem: Only 1 Agent Shows in Langfuse

**Root Causes Identified:**
1. No trace context propagation from parent to child agents
2. Agent constructors don't accept traceId parameter
3. Observability functions (`createAgentTrace`, `recordAgentGeneration`) exist but are unused
4. Workflow steps create agents without Langfuse traces
5. Agent consultation tools don't pass trace context

### Current Agent Structure

```
src/domains/storyteller/agents/v2/
├── storyteller-agent.ts    # Main coordinator (only traced agent)
├── psychologist-agent.ts   # Character psychology
├── gardener-agent.ts       # Prose writing
├── consequence-agent.ts    # Continuity validation
├── devils-advocate-agent.ts # Critical review
├── premise-architect-agent.ts # Episode premise
├── consistency-agent.ts    # Consistency checking
└── story-workflow.ts       # Workflow orchestration
```

## Proposed Mastra Architecture

### 1. Workspace Configuration

```typescript
// src/agent-core/workspace/storyteller-workspace.ts
import { Workspace } from '@mastra/core'

export const storytellerWorkspace = new Workspace({
  filesystem: new LocalFilesystem({
    basePath: './workspace/storyteller'
  }),
  sandbox: new LocalSandbox({
    workingDirectory: './workspace/storyteller'
  }),
  search: {
    mode: 'hybrid',
    bm25: { /* config */ },
    vector: {
      store: 'pinecone', // or local
      embedder: voyageEmbeddings
    },
    autoIndexPaths: [
      './workspace/storyteller/scripts',
      './workspace/storyteller/world-bible'
    ]
  },
  skills: [
    './skills/storyteller',
    './skills/writing'
  ]
})
```

### 2. Skills Structure

```
skills/
├── storyteller/
│   ├── SKILL.md              # Main storyteller skill
│   ├── references/
│   │   ├── save-the-cat.md   # Story structure reference
│   │   └── character-arcs.md
│   └── scripts/
│       ├── analyze-beat.ts
│       └── check-consistency.ts
├── writing/
│   ├── SKILL.md              # Writing skill
│   ├── references/
│   │   └── prose-guidelines.md
│   └── scripts/
│       └── polish-dialogue.ts
└── psychology/
    ├── SKILL.md              # Character psychology skill
    └── references/
        └── emotion-wheel.md
```

### 3. Agent Hierarchy with Tracing

```
┌─────────────────────────────────────────────────────────────────┐
│  StorytellerAgent (Supervisor)                                  │
│  - Creates root Langfuse trace                                  │
│  - Passes traceId to all child operations                       │
└─────────────────────────────────────────────────────────────────┘
         │
         ├─── PsychologistAgent (creates child trace)
         ├─── GardenerAgent (creates child trace)
         ├─── ConsequenceAgent (creates child trace)
         ├─── DevilsAdvocateAgent (creates child trace)
         └─── PremiseArchitectAgent (creates child trace)
```

### 4. Workflow with Proper Tracing

```typescript
// Each step creates a child trace
const storyCreationWorkflow = new Workflow({
  name: 'story-creation',
  steps: [
    {
      name: 'psychology-analysis',
      execute: async ({ context, traceId }) => {
        const childTrace = createAgentTrace({
          traceId,
          agentName: 'Psychologist',
          parentTraceId: traceId
        })
        // ... agent work
      }
    }
  ]
})
```

## Implementation Plan

### Phase 1: Fix Langfuse Tracing (Priority)

1. **Update Agent Base Class** - Add traceId to all agent constructors
2. **Fix Agent Tools** - Pass trace context when consulting agents
3. **Fix Workflow** - Retrieve traceId from context and create child traces
4. **Enhance Stream Route** - Ensure trace propagation

### Phase 2: Implement Mastra Workspaces

1. Create workspace configuration
2. Setup filesystem for scripts/artifacts
3. Configure auto-indexing for content

### Phase 3: Implement Mastra Skills

1. Create skill structure for storyteller
2. Define SKILL.md files
3. Add reference documentation
4. Create executable scripts

### Phase 4: Implement Mastra Search

1. Configure hybrid search (BM25 + vector)
2. Index world bible content
3. Index scripts and references
4. Add search tools to agents

## Folder Structure After Implementation

```
src/
├── agent-core/
│   ├── workspace/
│   │   ├── storyteller-workspace.ts
│   │   └── index.ts
│   ├── observability.ts (enhanced)
│   └── persistence/
├── domains/storyteller/
│   ├── agents/v2/
│   │   ├── base-agent.ts (NEW - with tracing)
│   │   ├── storyteller-agent.ts
│   │   └── ... (updated with tracing)
│   ├── workflows/
│   │   └── story-creation.ts (with tracing)
│   └── tools/v2/
│       └── agent-tools.ts (with tracing)
└── skills/
    ├── storyteller/
    ├── writing/
    └── psychology/

workspace/
├── storyteller/
│   ├── scripts/        # Generated/stored scripts
│   ├── world-bible/    # World building content
│   └── episodes/       # Episode content
```

## Success Criteria

1. ✅ All 6 agents visible in Langfuse traces
2. ✅ Parent-child trace relationships maintained
3. ✅ Thinking process visible in UI when Activity is ON
4. ✅ E2E tests verify trace creation
5. ✅ Workspaces manage script artifacts
6. ✅ Skills provide reusable agent instructions
7. ✅ Search enables content discovery

---

## Implementation Status (Completed 2024-01-30)

### 1. Multi-Agent Langfuse Tracing ✅

**Files Modified:**
- `src/domains/storyteller/agents/v2/*.ts` - All agents accept trace context
- `src/domains/storyteller/tools/v2/agent-tools.ts` - Thinking emission via `emitAgentThinking()`
- `src/app/api/storyteller/chat/stream/route.ts` - AGENT_THOUGHT event listener

**How It Works:**
1. Stream route creates master trace and runs within `workflowContext`
2. Agent tools retrieve trace ID via `getWorkflowTraceId()`
3. Specialized agents create child traces under the master trace
4. Thinking is emitted through event bus and forwarded to SSE stream

### 2. Thinking Display UI ✅

**Files Modified:**
- `src/domains/storyteller/components/AgentLog.tsx`
- `src/domains/chat/hooks/useChatStream.ts`
- `src/domains/chat/types.ts`

**Features:**
- Multi-agent thinking entries with agent attribution
- Collapsible thinking blocks per agent
- Agent-specific icons and colors
- Real-time thinking stream display

### 3. Mastra Workspaces ✅

**Location:** `src/agent-core/workspace/`

**Features:**
- `StorytellerWorkspace` class for artifact management
- CRUD for scripts, outlines, beat-boards, character sheets, world-bible
- Project-scoped storage
- Auto-indexing for search

### 4. Mastra Skills ✅

**Location:** `skills/`

**Skills Created:**
- `storyteller/` - Story structure, Save the Cat beats
- `writing/` - Prose, dialogue, show-don't-tell
- `psychology/` - Character analysis frameworks

**Loader:** `src/agent-core/skills/skill-loader.ts`

### 5. Mastra Search ✅

**Location:** `src/agent-core/search/`

**Features:**
- BM25 keyword search
- Reciprocal Rank Fusion (RRF) for result merging
- Highlight extraction
- Integration with workspace

### 6. E2E Tests ✅

**Location:** `e2e/agent/`

**Tests:**
- `verify-langfuse-traces.ts` - Individual agent tracing
- `verify-workspace.ts` - Workspace CRUD operations
- `verify-multi-agent-conversation.ts` - Multi-agent flows

### Running Tests

```bash
# Langfuse trace verification
npx ts-node e2e/agent/verify-langfuse-traces.ts

# Workspace CRUD test
npx ts-node e2e/agent/verify-workspace.ts

# Multi-agent conversation test
npx ts-node e2e/agent/verify-multi-agent-conversation.ts
```

### File Structure

```
src/
├── agent-core/
│   ├── workspace/
│   │   └── storyteller-workspace.ts
│   ├── skills/
│   │   └── skill-loader.ts
│   ├── search/
│   │   └── hybrid-search.ts
│   └── observability.ts
├── domains/storyteller/
│   ├── agents/v2/           # ✅ All trace-enabled
│   ├── tools/v2/agent-tools.ts  # ✅ Thinking emission
│   └── components/AgentLog.tsx  # ✅ Multi-agent UI
└── app/api/storyteller/chat/stream/route.ts  # ✅ Event listener

skills/
├── storyteller/SKILL.md
├── writing/SKILL.md
└── psychology/SKILL.md

e2e/agent/
├── verify-langfuse-traces.ts
├── verify-workspace.ts
└── verify-multi-agent-conversation.ts
```

### Next Steps

1. **Vector Search** - Add embedding-based semantic search using Voyage
2. **Skill Hot-Reload** - Watch for SKILL.md changes in development
3. **Workspace UI** - Script browser component in the storyteller UI
4. **Integration Test** - Full storyteller flow with end-to-end verification
