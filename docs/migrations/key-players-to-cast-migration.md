# Migration: Key Players to Cast

## Overview
Replace the "Key Players" section in the World Bible with direct Cast generation through the CharacterPanel sidebar.

## Current State
- `BibleCharacters.tsx` displays "Key Players" in the World Bible
- `KeyCharacter` schema is used for simple character definitions
- `Character` schema in `CharacterPanel` is more detailed with psychological metrics

## Target State
- Remove "Key Players" section from World Bible
- Cast generation happens through CharacterPanel
- Agent uses `UPDATE_CAST` action instead of `UPDATE_KEY_CHARACTERS`

## Migration Steps

### Step 1: Update Enums (`enums.ts`)
```typescript
// Remove:
// KEY_CHARACTERS = 'keyCharacters',

// Rename UPDATE_KEY_CHARACTERS to UPDATE_CAST:
// UPDATE_KEY_CHARACTERS = 'UPDATE_KEY_CHARACTERS', -> UPDATE_CAST = 'UPDATE_CAST',
```

### Step 2: Update action-config.ts
```typescript
// Remove KEY_CHARACTERS from SECTION_CONFIGS
// Add CAST config pointing to CharacterPanel
```

### Step 3: Update storyteller-agent.ts prompt
```typescript
// Replace:
// - **characters** → call update_world_bible with { projectId, keyCharacters: [...] }
// With:
// - **cast/characters** → call manage_cast with { projectId, characters: [...] }
```

### Step 4: Update section-prompts.ts
- Remove KEY_CHARACTERS prompt
- Add CAST prompt if needed

### Step 5: Update WorldBiblePanel.tsx
- Remove BibleCharacters import and usage
- Remove "Cast" tab (now handled by sidebar)

### Step 6: Update agent-schemas.ts
- Deprecate `KeyCharacter` schema
- Ensure `Character` schema has all needed fields

### Step 7: Update Tools
- Update `update_world_bible` to not handle keyCharacters
- Add `manage_cast` tool or extend existing character tools

### Step 8: Update Story Plan Fields
- Remove `keyCharacters` from `STORY_PLAN_FIELDS`
- Ensure `characters` is properly handled

### Step 9: Update Guardrails
- Update consistency guardrails to check Cast instead of Key Players
- Update output guardrails for new action type

### Step 10: Update Tests
- Update E2E tests to use new CAST action
- Remove Key Players specific tests

## Files to Update
1. `src/domains/storyteller/enums.ts`
2. `src/domains/storyteller/config/action-config.ts`
3. `src/domains/storyteller/agents/v2/storyteller-agent.ts`
4. `src/domains/storyteller/prompts/section-prompts.ts`
5. `src/domains/storyteller/components/WorldBiblePanel.tsx`
6. `src/domains/storyteller/components/WorldBible/BibleCharacters.tsx` (DELETE)
7. `src/domains/storyteller/schemas/agent-schemas.ts`
8. `src/domains/storyteller/tools/v2/world-building-tools.ts`
9. `src/domains/storyteller/utils/bible-utils.ts`
10. `src/domains/storyteller/guardrails/*.ts`
11. `src/domains/storyteller/graph/action-reducer.ts`
12. `src/domains/storyteller/components/ActionApprovalModal.tsx`
13. `src/domains/storyteller/utils/section-utils.ts`

## Risk Assessment
- **High**: This is a breaking change affecting character creation flow
- **Mitigation**: Feature flag to toggle between old and new behavior
- **Rollback**: Keep old code paths available behind feature flag

## Timeline
- Phase 1: Add feature flag and new action type (non-breaking)
- Phase 2: Migrate agent prompts to prefer new flow
- Phase 3: Remove old Key Players code after validation
