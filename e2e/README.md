# Swiss Army Knife E2E Tests

End-to-end tests for the cross-domain integration system.

## Overview

These tests verify the complete "Swiss Army Knife" workflow:

1. **Entity Creation** - Characters, mechanics, locations created in one domain
2. **Auto-Sync** - Entities automatically sync to `game_entities` table
3. **Cross-Domain Mentions** - @mention entities from other domains in chat
4. **AI Context** - AI agents receive full context from cross-domain entities
5. **Workflow Suggestions** - Toast notifications guide users across domains
6. **Hub Dashboard** - Centralized view of all entities across domains

## Test Files

### `swiss-knife-integration.test.ts`

Complete end-to-end workflow test covering:

- Character creation in Storyteller
- Entity auto-sync verification
- Cross-domain @mentions in Loop Creator
- AI context injection
- Mechanic creation with suggestions
- Hub dashboard verification
- Roundtrip back to Storyteller

### `mention-system.test.ts`

Detailed tests for the @mention system:

- Autocomplete across domains
- Source domain badges
- Filtered search
- Context injection
- Mention chip navigation

## Setup

### 1. Install Playwright

```bash
npm install -D @playwright/test
npx playwright install
```

### 2. Set Environment Variables

Create `.env.test`:

```bash
TEST_PROJECT_ID=test-project-swiss-knife
BASE_URL=http://localhost:3000
DATABASE_URL=postgresql://...
```

### 3. Run Database Migrations

```bash
npx supabase migration up
```

Make sure the `game_entities` tables are created:

- `game_entities`
- `entity_relationships`

## Running Tests

### Run all E2E tests

```bash
npx playwright test
```

### Run specific test file

```bash
npx playwright test swiss-knife-integration
```

### Run with UI mode (interactive)

```bash
npx playwright test --ui
```

### Run and show browser

```bash
npx playwright test --headed
```

### Debug mode

```bash
npx playwright test --debug
```

## Test Workflow

### Complete Swiss Army Knife Test Flow

```
1. Start: Hub Dashboard
   ↓
2. Navigate to Storyteller
   ↓
3. Create Character "Alex Shadow"
   ├─ Character saved to DB
   └─ game_entities record created
   ↓
4. Navigate to Loop Creator
   ↓
5. Type @Alex in chat
   ├─ Autocomplete shows "Alex Shadow"
   ├─ Badge shows "Storyteller" source
   └─ Multi-domain indicator (if used elsewhere)
   ↓
6. Select @AlexShadow mention
   ↓
7. Send message: "Design mechanics for @AlexShadow"
   ├─ AI receives character data from game_entities
   ├─ AI knows: role, description, stats
   └─ AI responds with tailored mechanics
   ↓
8. Create mechanic "Shadow Step"
   ├─ Mechanic saved to DB
   ├─ game_entities record created
   └─ Suggestion toast appears:
       "Write a story featuring Shadow Step?"
   ↓
9. Click suggestion → Navigate to Storyteller
   ├─ Auto-message set in sessionStorage
   └─ Chat pre-populated with context
   ↓
10. In Storyteller, type @Shadow
    ├─ Autocomplete shows "Shadow Step"
    ├─ Badge shows "Loop Creator" source
    └─ AI has full mechanic context
    ↓
11. ✅ Complete roundtrip verified
```

## Expected Results

### ✅ Pass Criteria

1. **Entity Creation**
   - Character created successfully
   - Returns `201` status
   - Returns `_suggestions` array

2. **Auto-Sync**
   - GET `/api/entities?projectId=X` returns new character
   - Entity has correct `entityType`, `sourceDomain`, `usedInDomains`

3. **Cross-Domain Mentions**
   - Autocomplete shows entities from ALL domains
   - Mentions display source domain badge
   - Clicking mention chip navigates to source

4. **AI Context**
   - AI agents receive `<cross_domain_context>` XML
   - AI responses reference cross-domain entities
   - AI tailors responses to entity data

5. **Suggestions**
   - Character creation returns suggestions
   - Loop creation returns suggestions
   - Suggestions include `targetRoute` and `autoMessage`

6. **Hub Dashboard**
   - Shows entity counts by type
   - Shows entity counts by domain
   - Search finds entities across domains
   - Clicking entity navigates to source

## Troubleshooting

### Tests fail with "Element not found"

**Cause:** Selectors may not match your UI

**Fix:** Update selectors in test files to match your component structure

### AI doesn't receive context

**Cause:** Cross-domain context builder not called

**Fix:** Verify `buildCrossDomainContext()` is called in:

- `src/domains/storyteller/agents/agent-v2-base.ts`
- `src/domains/loop-creator/agents/supervisor.ts`

### Mentions don't show cross-domain entities

**Cause:** Game entity provider not added to mention providers

**Fix:** Check these files include `getGameEntityProvider()`:

- `src/app/app/[projectId]/storyteller/page.tsx`
- `src/domains/loop-creator/components/LoopCreatorLayout.tsx`

### Suggestions don't appear

**Cause:** API not returning `_suggestions`

**Fix:** Verify suggestion logic in:

- `src/app/api/storyteller/characters/route.ts`
- `src/app/api/loop-creator/loops/route.ts`

## CI/CD Integration

### GitHub Actions

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Performance Benchmarks

Expected test execution times:

- `swiss-knife-integration.test.ts`: ~45s
- `mention-system.test.ts`: ~25s
- **Total suite**: ~70s

## Maintenance

### When to update tests

1. **UI changes**: Update selectors
2. **New entity types**: Add test cases
3. **New domains**: Add integration tests
4. **API changes**: Update request/response assertions

### Test data cleanup

Tests create entities with prefix `test-`. Clean up periodically:

```sql
DELETE FROM game_entities
WHERE name LIKE '%Test%'
  OR tags @> ARRAY['test'];
```
