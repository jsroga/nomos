# AI layer migration (`agents/` → `ai/` + `ai/agents/`)

Track rename of domain Mastra trees to match UI layer discipline.

## Convention

| Layer | Path | Contents |
|-------|------|----------|
| **AI root** | `src/domains/<m>/ai/` | `constants/`, `tools/`, `workflows/`, `prompts/`, barrels, `request-context.ts`, `tracing.ts` |
| **Agent packages** | `src/domains/<m>/ai/agents/` | Mastra `Agent` classes, critic agents, LangChain wrappers, multi-file agent folders |

Parallel to UI:

| UI | AI |
|----|-----|
| `ui/components/` | `ai/agents/` |
| `ui/constants/`, `hooks/`, `utils/` | `ai/constants/`, `tools/`, `workflows/`, `prompts/` |

**Naming:** domain folder is `ai/` (not `agents/`). Nested implementations are `ai/agents/` (not `subagents/`).

## Status

| Domain | `agents/` → `ai/` | packages → `ai/agents/` | imports | conformance test |
|--------|-------------------|---------------------------|---------|------------------|
| storyteller | done | BeatPlanner, GrrmAuthor, Muse, StorytellerAgent, critics | done | `aiLayerStructureEnforced: true` |
| loop-creator | done | market-analyst + flat agent modules | done | `aiLayerStructureEnforced: true` |
| game-design | done | game-design-agent, memory, pattern-wire; workflow → `ai/workflows/` | done | `aiLayerStructureEnforced: true` |

## Import path cheat sheet

```ts
// Before
import { X } from '@/domains/storyteller/agents/BeatPlanner/beat-plan-schema'
import { Y } from '@/domains/storyteller/agents/tools/beat-tools'
import { Z } from '@/domains/storyteller/agents'

// After
import { X } from '@/domains/storyteller/ai/agents/BeatPlanner/beat-plan-schema'
import { Y } from '@/domains/storyteller/ai/tools/beat-tools'
import { Z } from '@/domains/storyteller/ai'
```

## Docs updated

- [x] `AGENTS.md`
- [x] `CLAUDE.md`
- [x] `docs/unified/ARCHITECTURE.md`
- [x] `.cursor/rules/domain-structure.mdc`
- [x] `.cursor/rules/mastra-agent-pattern.mdc`
- [x] `src/domains/__tests__/domain-conformance.ts`
- [x] `src/domains/__tests__/domain-structure.test.ts`

## Migration script

`node .local/scripts/migrate-agents-to-ai.mjs` — one-time; already run 2026-07-15.
