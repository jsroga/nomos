# ESLint Deep-Import Guard Template

Pattern for per-module barrel enforcement (clone from `eslint.config.js:172-186`).

## Template

```javascript
{
  files: ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
  ignores: ['src/domains/<MODULE>/**'],  // Allow internal imports
  rules: {
    'no-restricted-imports': [
      'warn',  // Start at 'warn'; flip to 'error' after referrers are clean
      {
        patterns: [
          {
            group: ['@/domains/<MODULE>/*'],
            message: 'Import from "@/domains/<MODULE>" instead of <MODULE> internals.',
          },
        ],
      },
    ],
  },
},
```

## Usage

1. Replace `<MODULE>` with the domain name (e.g., `world-building-toolkit`)
2. Add block to `eslint.config.js` after the storyteller guard
3. Start at severity `'warn'` during the referrer cleanup wave
4. Flip to `'error'` once `grep -rn "@/domains/<MODULE>/" src/ tests/ | grep -v "^src/domains/<MODULE>"` returns only barrel imports
5. Verify with `npm run lint`

## Current status (Wave 0)

- storyteller: ✅ guard exists (currently `'warn'`, will flip to `'error'` at todo #24)
- Other 8 modules: ⏳ will add during Wave 2 (todo #38)

## Notes

- The `ignores` key allows the module itself to use deep imports internally
- External files (outside `src/domains/<MODULE>/`) can only import from the barrel
- This enforces the §2 principle #10 (one public barrel per module)
