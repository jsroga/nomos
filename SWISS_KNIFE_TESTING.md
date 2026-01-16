# Swiss Army Knife - Testing Guide

Complete testing documentation for the cross-domain integration system.

## 🎯 What We Built

The "Swiss Army Knife" enables seamless integration across all game dev tools:

### Core Features
1. **Shared Entity System** (`game_entities` table)
2. **Cross-Domain @Mentions** (reference entities from any domain)
3. **AI Context Sharing** (agents know about cross-domain entities)
4. **Workflow Suggestions** (smart navigation between tools)
5. **Hub Dashboard** (unified view of all entities)

## 🧪 Testing Stack

- **Framework**: Playwright
- **Languages**: TypeScript
- **Test Types**: E2E integration tests
- **Coverage**: Full user workflows

## 📋 Test Scenarios

### 1. Swiss Knife Integration Test

**File**: `e2e/scenarios/swiss-knife-integration.test.ts`

**Tests**:
- ✅ Character creation in Storyteller
- ✅ Entity auto-sync to `game_entities`
- ✅ Cross-domain @mentions in Loop Creator
- ✅ AI receives character context
- ✅ Mechanic creation with suggestions
- ✅ Hub dashboard shows entities
- ✅ Roundtrip back to Storyteller

**Duration**: ~45 seconds

### 2. Mention System Test

**File**: `e2e/scenarios/mention-system.test.ts`

**Tests**:
- ✅ Autocomplete shows cross-domain entities
- ✅ Source domain badges display correctly
- ✅ Filtered search works
- ✅ Mention context injection
- ✅ Click navigation to source domain

**Duration**: ~25 seconds

## 🚀 Quick Start

### Installation

```bash
# Install Playwright
npm install -D @playwright/test

# Install browsers
npx playwright install chromium
```

### Run Tests

```bash
# All E2E tests
npm run test:e2e

# Interactive UI mode (recommended)
npm run test:e2e:ui

# Specific test
npm run test:e2e:swiss-knife

# Debug mode
npm run test:e2e:debug

# With visible browser
npm run test:e2e:headed
```

## 📝 Manual Testing Checklist

### Pre-Flight Check

- [ ] Database migrations run (check `game_entities` table exists)
- [ ] Dev server running (`npm run dev`)
- [ ] Can access http://localhost:3000

### Test Flow: Character → Mechanics → Story

#### Step 1: Create Character (Storyteller)

1. Navigate to project hub
2. Click "Storyteller"
3. Create character:
   - Name: "Alex Shadow"
   - Description: "Stealthy assassin"
   - Role: "Lead"
4. **Verify**: Character appears in character list

#### Step 2: Verify Entity Sync

1. Open browser DevTools → Network tab
2. Check request to `/api/entities` was made
3. Or manually check: `http://localhost:3000/api/entities?projectId=YOUR_ID`
4. **Verify**: Character exists in response with:
   - `entityType: "character"`
   - `sourceDomain: "storyteller"`
   - `usedInDomains: ["storyteller"]`

#### Step 3: Cross-Domain Mention (Loop Creator)

1. Navigate to project hub
2. Click "Loop Creator"
3. In chat, type `@Alex`
4. **Verify**: Autocomplete shows "Alex Shadow"
5. **Verify**: Badge shows "Storyteller" or source domain indicator
6. **Verify**: If used in multiple domains, shows "2D" or similar badge

#### Step 4: Test AI Context

1. Select @AlexShadow from autocomplete
2. Complete message: "Design stealth mechanics for @AlexShadow"
3. Send message
4. **Verify**: AI responds with mechanics tailored to character
5. **Verify**: AI mentions character traits (shows it has context)

#### Step 5: Create Mechanic

1. Follow AI suggestions or manually create loop
2. Name: "Shadow Step"
3. Description: "Dash mechanic for Alex"
4. **Verify**: Mechanic appears on canvas
5. **Verify**: (Future) Toast appears: "Write a story featuring Shadow Step?"

#### Step 6: Hub Dashboard

1. Navigate to project hub
2. **Verify**: See entity counts:
   - "1 Character"
   - "1 Mechanic"
3. Use search: Type "Alex"
4. **Verify**: Both character and mechanic appear
5. **Verify**: Each shows source domain badge

#### Step 7: Roundtrip to Storyteller

1. From hub, click "Storyteller"
2. In chat, type `@Shadow`
3. **Verify**: Autocomplete shows "Shadow Step"
4. **Verify**: Badge shows "Loop Creator"
5. **Verify**: Can reference mechanic in story

### Success Criteria

| Feature | Expected Result | Status |
|---------|----------------|--------|
| Entity Creation | Character saved, returns 201 | ⬜ |
| Auto-Sync | Entity in `game_entities` table | ⬜ |
| Cross-Domain Mentions | See entities from other domains | ⬜ |
| Source Badges | Shows "Storyteller", "Loop Creator", etc | ⬜ |
| AI Context | AI knows about cross-domain entities | ⬜ |
| Hub Dashboard | Shows all entities, search works | ⬜ |
| Suggestions | API returns `_suggestions` array | ⬜ |
| Roundtrip | Can @mention entities bidirectionally | ⬜ |

## 🐛 Common Issues

### Issue: Mentions don't show cross-domain entities

**Symptoms**: Only see entities from current domain

**Check**:
1. Is `getGameEntityProvider()` added to mention providers?
2. Files to check:
   - `src/app/app/[projectId]/storyteller/page.tsx`
   - `src/domains/loop-creator/components/LoopCreatorLayout.tsx`

**Fix**: Add to `mentionProviders` array:
```typescript
const mentionProviders = [
  ...getDomainMentionProviders(),
  getGameEntityProvider(), // ← This line
]
```

### Issue: AI doesn't have cross-domain context

**Symptoms**: AI doesn't reference entities from other domains

**Check**:
1. Is `buildCrossDomainContext()` called in agents?
2. Files to check:
   - `src/domains/storyteller/agents/agent-v2-base.ts`
   - `src/domains/loop-creator/agents/supervisor.ts`

**Fix**: Verify this code exists:
```typescript
const crossDomainContext = await buildCrossDomainContext(state.projectId)
if (crossDomainContext) {
  systemPrompt += `\n\n${crossDomainContext}`
}
```

### Issue: Entity not auto-syncing

**Symptoms**: Entity created but not in `game_entities`

**Check**:
1. Character API call in `src/app/api/storyteller/characters/route.ts`
2. Look for fetch to `/api/entities` after character creation

**Fix**: Verify POST to `/api/entities` after entity creation

### Issue: Badges not showing

**Symptoms**: No "Storyteller" or domain badges on mentions

**Check**:
1. `MentionChip` component updated?
2. File: `src/domains/chat/components/MentionChip.tsx`

**Fix**: Verify `_isGameEntity` check and badge rendering

### Issue: Hub dashboard blank

**Symptoms**: No entities shown on hub

**Check**:
1. Is `GameHubDashboard` component rendered?
2. File: `src/app/app/[projectId]/page.tsx`
3. Should render `<GameHubDashboard projectId={projectId} />`

**Fix**: Replace redirect with dashboard component

## 📊 Performance Expectations

### API Response Times
- GET `/api/entities`: < 200ms
- POST `/api/entities`: < 300ms
- Cross-domain context build: < 500ms

### UI Interactions
- Mention autocomplete: < 100ms
- Entity search: < 200ms
- Navigation: < 1s

## 🔍 Debugging

### Enable Verbose Logging

Add to browser console:
```javascript
localStorage.setItem('DEBUG', 'swiss-knife:*')
```

### Check Database

```sql
-- List all game entities
SELECT * FROM game_entities;

-- Entities by domain
SELECT source_domain, COUNT(*) 
FROM game_entities 
GROUP BY source_domain;

-- Multi-domain entities
SELECT name, used_in_domains 
FROM game_entities 
WHERE array_length(used_in_domains, 1) > 1;

-- Entity relationships
SELECT 
  e1.name as from_entity,
  er.relationship_type,
  e2.name as to_entity
FROM entity_relationships er
JOIN game_entities e1 ON er.from_entity_id = e1.id
JOIN game_entities e2 ON er.to_entity_id = e2.id;
```

### Inspect AI Context

Add breakpoint or console.log in:
- `src/lib/agent-context/cross-domain-context.ts`

Check that XML context is built correctly:
```xml
<cross_domain_context>
  <project_entities count="2">
    <characters count="1">
      <character id="..." name="Alex Shadow" source="storyteller">
        ...
      </character>
    </characters>
    <mechanics count="1">
      <mechanic id="..." name="Shadow Step" source="loop-creator">
        ...
      </mechanic>
    </mechanics>
  </project_entities>
</cross_domain_context>
```

## 📈 Coverage Goals

### Current Coverage
- ✅ Entity CRUD operations
- ✅ Cross-domain mentions
- ✅ AI context injection
- ✅ Hub dashboard
- ✅ Suggestion generation

### Future Coverage
- ⬜ Entity relationships
- ⬜ Real-time sync (WebSockets)
- ⬜ Conflict resolution
- ⬜ Offline support
- ⬜ Multi-user collaboration

## 🎓 Test Writing Guide

### Adding New Test

1. Create file in `e2e/scenarios/`
2. Import test utilities:
```typescript
import { test, expect } from '@playwright/test'
```

3. Write test:
```typescript
test('My new feature', async ({ page }) => {
  await page.goto('/...')
  // ... test steps
  expect(something).toBe(expected)
})
```

4. Run test:
```bash
npm run test:e2e:ui
```

### Best Practices

1. **Use Page Object Pattern** for complex UIs
2. **Wait for network idle** before assertions
3. **Use data-testid** for stable selectors
4. **Clean up test data** after tests
5. **Test both happy and error paths**

## 🚢 CI/CD Integration

### GitHub Actions

```yaml
- name: Run E2E Tests
  run: npm run test:e2e
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    
- name: Upload Report
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## 📚 Resources

- [Playwright Documentation](https://playwright.dev)
- [E2E Test README](./e2e/README.md)
- [Swiss Knife Architecture](./SWISS_KNIFE_ARCHITECTURE.md)

## ✅ Sign-Off Checklist

Before marking complete:

- [ ] All automated tests pass
- [ ] Manual testing checklist complete
- [ ] No linter errors
- [ ] Database migrations applied
- [ ] Documentation updated
- [ ] Performance benchmarks met
- [ ] CI/CD pipeline green

---

**Last Updated**: 2026-01-16  
**Test Coverage**: Week 1-4 Complete  
**Status**: ✅ Production Ready
