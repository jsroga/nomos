# 🚀 Swiss Army Knife - Quick Start Guide

**Ready to test in 5 minutes!**

---

## Step 1: Run Migration (30 seconds)

```bash
npx supabase migration up
```

This creates:
- `game_entities` table
- `entity_relationships` table
- All indexes and RLS policies

**Verify**:
```sql
SELECT * FROM game_entities LIMIT 1;
```

Should return empty table (no error).

---

## Step 2: Install Test Dependencies (1 minute)

```bash
npm install
npx playwright install chromium
```

---

## Step 3: Start Dev Server (already running)

```bash
npm run dev
```

Open: http://localhost:3000

---

## Step 4: Manual Test (3 minutes)

### Create Character in Storyteller

1. Navigate to a project
2. **IMPORTANT**: Should see **Hub Dashboard** (not auto-redirect)
   - Shows "0 characters, 0 mechanics, 0 locations"
   - Shows 6 domain cards
3. Click "Storyteller"
4. Create character:
   - Name: "Test Alex"
   - Click "Create Character" or similar button

### Verify Entity Sync

Open browser console:
```javascript
fetch('/api/entities?projectId=YOUR_PROJECT_ID')
  .then(r => r.json())
  .then(d => console.log('Entities:', d.entities))
```

Should see "Test Alex" in entities array.

### Test Cross-Domain Mention

1. Go back to Hub (click logo or navigate to `/app/YOUR_PROJECT_ID`)
2. Click "Loop Creator"
3. In chat, type: `@Test`
4. **VERIFY**: Autocomplete shows "Test Alex" with "Storyteller" badge
5. Select it
6. Complete: "@TestAlex Design stealth mechanics"
7. Send message
8. **VERIFY**: AI responds (may take 10-20 seconds)

### Success!

If AI responds with mechanics, **the Swiss Army Knife works**! 🎉

---

## Step 5: Run Automated Tests (2 minutes)

```bash
# Run Swiss Knife integration test
npm run test:e2e:swiss-knife

# Or run in UI mode (recommended)
npm run test:e2e:ui
```

**Expected**: All tests pass ✅

---

## 🐛 Quick Troubleshooting

### Issue: Hub Dashboard not showing

**Check**: Open `/app/[projectId]/page.tsx`

Should have:
```typescript
return <GameHubDashboard projectId={projectId} />
```

NOT:
```typescript
redirect(`/${projectId}/storyteller?bible=open`)
```

### Issue: @mentions don't work

**Check browser console** for:
```
Failed to fetch entities
```

**Fix**: Verify `/api/entities` endpoint works:
```bash
curl http://localhost:3000/api/entities?projectId=YOUR_ID
```

### Issue: AI doesn't have context

**Check server logs** for:
```
[Writer V2] Loaded cross-domain context
```

If missing, agents aren't calling `buildCrossDomainContext()`.

---

## ✅ Success Checklist

- [ ] Migration ran without errors
- [ ] Hub Dashboard shows at `/app/[projectId]`
- [ ] Can create character in Storyteller
- [ ] Character appears in Hub stats
- [ ] Can @mention character in Loop Creator
- [ ] Mention shows "Storyteller" badge
- [ ] AI receives character context
- [ ] Tests pass

---

## 🎯 Next Steps

1. **Test with real project**: Use your actual game project
2. **Try all domains**: Character → Mechanics → Location → Level
3. **Check performance**: Should be fast (< 500ms)
4. **Report issues**: Note anything broken or slow
5. **Iterate**: Based on your workflow needs

---

## 📚 Full Documentation

- **Testing Guide**: `SWISS_KNIFE_TESTING.md`
- **Implementation Details**: `SWISS_KNIFE_COMPLETE.md`
- **Technical Summary**: `IMPLEMENTATION_SUMMARY.md`
- **E2E Tests**: `e2e/README.md`

---

**Time to test**: ~5 minutes  
**Difficulty**: Easy  
**Impact**: 🚀 HIGH

Let's go! 🔪✨
