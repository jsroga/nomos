# Dead Code Report

> Auto-generated on 2026-02-26 by [Knip](https://knip.dev). Do not edit manually.
> Updates automatically via CI on every push to main and on PRs.

## Summary

| Category | Count |
|----------|-------|
| Unused exports | 1 |
| **Total** | **1** |

## Unused Exports

Exported but never imported. Remove `export` or delete.

| Export | File |
|--------|------|
| `initializeSearch` | `src/agent-core/search/hybrid-search.ts:315` |

## How to Fix

```bash
# Run locally
npx knip

# Only dependencies
npx knip --dependencies

# Only exports
npx knip --exports
```

False positives? Update `knip.json`:
- **Files**: add to `entry` or `ignore`
- **Dependencies**: add to `ignoreDependencies`
- **Exports**: ensure consuming code is listed in `entry`
