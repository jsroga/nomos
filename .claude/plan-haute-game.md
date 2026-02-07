# Haute Game Design Framework - Implementation Plan

## Overview
Implementing the unified game design philosophy combining Klei (systems), CDPR (narrative), and Kojima (connection) into practical agents and tools.

## Architecture

### Layer 1: New Tools (`src/domains/game-design/tools/v2/haute-game-tools.ts`)

#### 1. Atomic Loom Tool
- **ID**: `design_atomic_systems`
- **Purpose**: Break game concept into atomic verbs/nouns, map interactions
- **Input**: Game description, genre, existing mechanics
- **Output**: Atomic rules, interaction matrix, emergent combo list

#### 2. Memory Keeper Tool
- **ID**: `design_world_memory`
- **Purpose**: Create NPC memory and event propagation systems
- **Input**: Game events, NPCs, time scope
- **Output**: Memory system design, rumor propagation rules, quest triggers

#### 3. Grey Palette Tool
- **ID**: `design_moral_choices`
- **Purpose**: Create branching moral choices with real consequences
- **Input**: Story context, factions, values
- **Output**: Choice structure, consequences, faction impacts

#### 4. Strand Weaver Tool
- **ID**: `design_strand_connections`
- **Purpose**: Design async multiplayer trace systems
- **Input**: Game state, player actions, persistence scope
- **Output**: Trace types, inheritance rules, shared elements

#### 5. Silent Teacher Tool
- **ID**: `design_implicit_tutorial`
- **Purpose**: Replace tutorials with discovery-based learning
- **Input**: Mechanics to teach, player skill curve
- **Output**: Learning scenarios, safe failure points, breadcrumb design

#### 6. Mundane Poet Tool
- **ID**: `design_meaningful_mundane`
- **Purpose**: Elevate routine actions into meaningful rituals
- **Input**: Routine mechanics, emotional beats, pacing
- **Output**: Ritual design, friction points, meditative moments

### Layer 2: New Schemas (`src/domains/game-design/schemas.ts` additions)

```typescript
// Atomic Systems
AtomicVerbSchema - { id, name, targets, effects }
AtomicNounSchema - { id, name, properties, states }
InteractionRuleSchema - { verb, noun, result, emergent }

// World Memory
MemoryEventSchema - { type, witnesses, decay, propagation }
RumorSchema - { source, distortion, spread_rate }

// Moral Choices
MoralChoiceSchema - { id, options, costs, faction_impacts }
ConsequenceChainSchema - { trigger, immediate, delayed, permanent }

// Strand Connections
TraceTypeSchema - { id, persistence, inheritance, visibility }
LegacyElementSchema - { source_player, element, transform_rules }

// Haute Game Output
HauteGameDesignSchema - combined output for all tools
```

### Layer 3: Update Agent (`src/domains/game-design/agent.ts`)

- Import all 6 new Haute Game tools
- Add to `allTools` array
- Update fallback instructions to mention new capabilities

### Layer 4: New Judge (`src/evaluation/judges/haute-game-judge.ts`)

```typescript
HauteGameJudge evaluates:
- systemElegance: Few rules, many outcomes
- emergentDepth: Unplanned possibilities discovered
- narrativeIntegration: Systems tell stories
- worldMemory: Consequences persist
- connectionMeaning: Multiplayer that matters
- mundaneBeauty: Small moments resonate
- cohesion: Everything serves one vision
- wouldPlayersTellStories: The ultimate test
```

### Layer 5: API Integration

The existing API route already handles:
- SSE events: `start`, `node`, `message`, `action`, `questions`, `state`, `complete`
- Action types that map to UI suggestions

New tools will output actions that map to existing types:
- `ADD_NODE` - for new atomic verbs/nouns
- `ADD_EDGE` - for interaction rules
- `MODIFY_NODE` - for elevating mundane mechanics

### Layer 6: Files to Create/Modify

| File | Action |
|------|--------|
| `src/domains/game-design/tools/v2/haute-game-tools.ts` | CREATE |
| `src/domains/game-design/schemas.ts` | MODIFY (add Haute schemas) |
| `src/domains/game-design/agent.ts` | MODIFY (register tools) |
| `src/evaluation/judges/haute-game-judge.ts` | CREATE |
| `src/evaluation/judges/index.ts` | MODIFY (export new judge) |
| `src/evaluation/judges/__tests__/haute-game-judge.test.ts` | CREATE |

## Implementation Order

1. ✅ Add Haute Game schemas to `schemas.ts`
2. ✅ Create `haute-game-tools.ts` with all 6 tools
3. ✅ Update `agent.ts` to register new tools
4. ✅ Create `haute-game-judge.ts`
5. ✅ Update `judges/index.ts`
6. ✅ Create test file
7. ✅ Run tests to verify

## Example Tool Output → UI Action Mapping

**Atomic Loom** produces atomic rules:
```json
{
  "type": "ADD_NODE",
  "payload": {
    "id": "verb-burn",
    "label": "Burn",
    "nodeType": "action",
    "description": "Applies heat to target, transforms state"
  }
}
```

**Strand Weaver** produces trace elements:
```json
{
  "type": "ADD_NODE",
  "payload": {
    "id": "trace-abandoned-base",
    "label": "Player Legacy",
    "nodeType": "feedback",
    "description": "Another player's abandoned progress becomes discoverable content"
  }
}
```

## Success Criteria

- [ ] All 6 tools created and functional
- [ ] Tools integrated with GameDesignAgent
- [ ] HauteGameJudge evaluates the combined output
- [ ] Existing UI continues to work (no breaking changes)
- [ ] Tests pass for new tools and judge
