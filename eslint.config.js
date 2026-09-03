const js = require('@eslint/js')
const typescript = require('@typescript-eslint/eslint-plugin')
const typescriptParser = require('@typescript-eslint/parser')
const react = require('eslint-plugin-react')
const reactHooks = require('eslint-plugin-react-hooks')
const reactCompiler = require('eslint-plugin-react-compiler')
const prettier = require('eslint-config-prettier')
const unusedImports = require('eslint-plugin-unused-imports')
const localRules = require('./eslint-rules')
const providerSdkExemptions = require('./eslint-rules/provider-sdk-exemptions')
const {
  DOMAIN_MODULES,
  PROVIDER_SDK_RESTRICTED_PATHS,
  barrelGuard,
  composeRestrictedImports,
  crossDomain,
  domainRemainderConfigs,
  edgeRuntime,
  legacyRoot,
  projectAccess,
  providerSdk,
  sharedNoDomains,
} = require('./eslint-rules/restricted-imports-policy.cjs')
const codeMetricsLimits = require('./scripts/code-metrics-limits.cjs')

const strictTypeScriptRules = typescript.configs.strict.rules

const domainBoundaryConfigs = DOMAIN_MODULES.map(domain => ({
  files: [`src/domains/${domain}/**/*.{ts,tsx}`],
  rules: {
    'no-restricted-imports': [
      'error',
      composeRestrictedImports(crossDomain(domain), legacyRoot(), providerSdk(), projectAccess()),
    ],
  },
}))

/**
 * SPEC-16: scoped module by module as each one's `contracts/` lands.
 *
 * `warn` while a module still has sites, `error` once it reaches zero —
 * flipping it repo-wide over a thousand guards would make `npm run lint`
 * useless on day one. The pilot has 13 guard sites left (its own aggregate is
 * done; what remains are trigger-status and API response shapes), so it is
 * `warn`; the `snakeCaseReadsInConvertedModules` ratchet holds the half that
 * is finished.
 */
const contractsConvertedModules = [
  {
    files: ['src/domains/3d-asset-exporter/**/*.{ts,tsx}'],
    rules: { 'local/no-untyped-json-read': 'warn' },
  },
]

module.exports = [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      '.mastra/**',
      '.local/**',
      '.design-sync/**',
      'out/**',
      'dist/**',
      'build/**',
      'coverage/**',
      // Built Storybook bundle (gitignored). Linting it produced ~133k errors
      // and made `npm run lint` unusable repo-wide.
      'storybook-static/**',
      '.trigger/**',
      '.cursor/**',
      '.claude/**',
      'playwright-report/**',
      'test-results/**',
      'next-env.d.ts',
      'public/scripts/**/*.min.js',
      'public/scripts/**/*.js',
      '**/*.min.js',
      // Deliberately-invalid files that prove each structural rule is switched
      // on. They MUST fail lint, so they are excluded from the repo-wide run and
      // asserted individually by scripts/__tests__/gate-fixtures.test.ts.
      // Excluding the fixtures does not weaken any rule — the test is what
      // guarantees the rules still fire.
      'scripts/gate-fixtures/**',
    ],
  },
  js.configs.recommended,
  // Configuration for .mjs files (Node scripts)
  {
    files: ['**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        AbortController: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        URL: 'readonly',
        Buffer: 'readonly',
      },
    },
  },
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        React: 'readonly',
        JSX: 'readonly',
        NodeJS: 'readonly',
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        global: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
        document: 'readonly',
        window: 'readonly',
        navigator: 'readonly',
        fetch: 'readonly',
        FormData: 'readonly',
        Headers: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      react: react,
      'react-hooks': reactHooks,
      'react-compiler': reactCompiler,
      'unused-imports': unusedImports,
      'local': localRules,
    },
    rules: {
      ...typescript.configs.recommended.rules,
      ...strictTypeScriptRules,
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...prettier.rules,
      '@typescript-eslint/no-explicit-any': 'error',
      // Ban `as Type` / `as any` / angle-bracket assertions (`as const` is still allowed).
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      // Inline wire/domain strings must use enums or named constants (JSX carve-out for Tailwind/labels).
      'local/no-magic-string': ['error', { allowJsx: true }],
      'max-lines': [
        'warn',
        {
          max: codeMetricsLimits.fileLines.warn,
          skipBlankLines: codeMetricsLimits.fileLines.skipBlankLines,
          skipComments: codeMetricsLimits.fileLines.skipComments,
        },
      ],
      'local/max-lines-strict': [
        'error',
        {
          max: codeMetricsLimits.fileLines.error,
          skipBlankLines: codeMetricsLimits.fileLines.skipBlankLines,
          skipComments: codeMetricsLimits.fileLines.skipComments,
        },
      ],
      complexity: ['warn', { max: codeMetricsLimits.complexity.warn }],
      'local/complexity-strict': ['error', { max: codeMetricsLimits.complexity.error }],
      'local/no-repeated-array-filter': 'error',
      'local/trigger-runs-ownership': 'error',
      'local/no-discarded-auth-context': 'error',
      'local/no-bare-project-id-param': 'error',
      'local/no-raw-trigger-task': 'error',
      '@typescript-eslint/no-require-imports': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/no-unescaped-entities': 'off', // Allow quotes/apostrophes in JSX for readability
      'react/jsx-no-comment-textnodes': 'off', // Allow comment-like text in JSX
      'react/no-unknown-property': [
        'error',
        {
          ignore: [
            // React Three.js (@react-three/fiber) props
            'args',
            'position',
            'rotation',
            'geometry',
            'material',
            'intensity',
            'castShadow',
            'receiveShadow',
            'userData',
            'frustumCulled',
            'transparent',
            'side',
            'depthWrite',
            'map',
            'metalness',
            'roughness',
            'emissive',
            'emissiveIntensity',
            'toneMapped',
            'object',
            // Three.js shader/material props
            'fragmentShader',
            'vertexShader',
            'uniforms',
            'blending',
            // styled-jsx props
            'jsx',
            'global',
          ],
        },
      ],
      semi: ['error', 'never'],
      quotes: ['error', 'single'],
      indent: 'off',
      'react-compiler/react-compiler': 'warn', // Optimization hints, not bugs
      'react-hooks/set-state-in-effect': 'warn', // Often intentional for syncing external state
      'react-hooks/immutability': 'off', // Allow mutating values for imperative APIs (THREE.js, etc.)
      'react-hooks/purity': 'off', // Allow Date.now(), Math.random() for animations/timestamps
      'react-hooks/preserve-manual-memoization': 'off', // Allow React compiler to skip optimization
      '@typescript-eslint/no-empty-object-type': 'off', // Allow {} types
      'no-empty': 'off', // Allow empty catch blocks with comments
      'no-control-regex': 'off', // Allow control characters in regex for input sanitization
      'no-useless-escape': 'off', // Allow escapes in regex for clarity
      'no-case-declarations': 'off', // Allow lexical declarations in case blocks
      'no-undef': 'off', // TypeScript handles this
      'no-unused-vars': 'off', // Using TypeScript version
      'no-redeclare': 'off', // TypeScript handles this (allows Zod schema + type pattern)
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  {
    files: [
      'eslint.config.js',
      '*.config.js',
      '*.config.cjs',
      'scripts/**/*.{ts,mjs,cjs,js}',
    ],
    rules: {
      'local/no-magic-string': 'off',
      'max-lines': 'off',
      'local/max-lines-strict': 'off',
      complexity: 'off',
      'local/complexity-strict': 'off',
    },
  },
  {
    files: ['eslint-rules/**/*.js'],
    rules: {
      'local/no-magic-string': 'off',
    },
  },
  {
    // Test files: describe/it titles, fixtures, and assertion messages are
    // inherently string-heavy — the magic-string rule targets RUNTIME wire/
    // domain values, not test prose. Other quality rules still apply.
    files: [
      '**/__tests__/**/*.{ts,tsx}',
      '**/*.test.{ts,tsx}',
      '**/*.e2e.test.{ts,tsx}',
      'e2e/**/*.{ts,tsx}',
      'stories/**/*.{ts,tsx}',
      '.storybook/**/*.{ts,tsx}',
    ],
    rules: {
      'local/no-magic-string': 'off',
    },
  },
  {
    // Eval harness (runners, golden datasets, fixtures, experiments): prompts,
    // reference prose, descriptions, CLI flags, and operator output ARE the
    // artifact (same class as test fixtures, `-scorer.ts` `.describe()` text,
    // and `scripts/**`), not runtime wire values.
    files: ['evals/**/*.{ts,tsx}'],
    rules: {
      'local/no-magic-string': 'off',
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: [
      'src/domains/**',
    ],
    rules: {
      'no-restricted-imports': ['error', composeRestrictedImports(barrelGuard())],
    },
  },
  // Per-domain boundaries: legacy roots + cross-domain isolation (domains only talk via @/shared)
  ...domainBoundaryConfigs,
  // Wave 2+ boundary rules — dissolved legacy folders (non-domain src only)
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/domains/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        composeRestrictedImports(barrelGuard(), providerSdk(), legacyRoot()),
      ],
    },
  },
  // Edge runtime: the proxy and anything it pulls in run on the Edge, where a
  // Node-only import (pg, node:fs, a provider SDK) fails at build time with a
  // message that does not name the cause. Catch it at lint instead.
  {
    files: [
      'src/proxy.ts',
      'src/shared/auth/api-default-deny.ts',
      'src/shared/auth/constants/session-cookie.ts',
      // Covered so the fixture proving this rule is on actually trips it.
      'scripts/gate-fixtures/proxy-imports-node-only.ts',
    ],
    rules: {
      'no-restricted-imports': ['error', composeRestrictedImports(edgeRuntime())],
    },
  },

  // Server configuration is read once, in `@/shared/config/env`, and validated
  // there. Scoped to `src/**`: tooling, evals and e2e run outside the app and
  // legitimately read the environment before any schema could parse it.
  {
    files: ['src/**/*.{ts,tsx}', 'scripts/gate-fixtures/src/services/reads-bare-process-env.ts'],
    ignores: [
      // Dissolved by SPEC-13 Task 13 into the model gateway's registry.
      // Migrating them here would be work thrown away, so they are named
      // rather than silently skipped, and `processEnvReadsInModelConfig`
      // tracks the count.
      'src/shared/agent-kernel/models.ts',
      'src/shared/agent-kernel/model-settings.ts',
      'src/shared/data/constants/llm-providers.ts',
      'src/domains/*/config/model-config.ts',
      'src/domains/*/config/constants/model-config.ts',
    ],
    rules: { 'local/no-bare-process-env': 'error' },
  },

  // `verifyProjectAccess` answers a boolean a caller can check and then ignore.
  // `projectScope` returns proof that must be carried, so it is the only way in.
  {
    files: [
      'src/**/*.{ts,tsx}',
      'scripts/gate-fixtures/src/services/imports-project-access.ts',
    ],
    ignores: ['src/shared/auth/**', 'src/domains/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        composeRestrictedImports(barrelGuard(), providerSdk(), legacyRoot(), projectAccess()),
      ],
    },
  },

  // Boundary rule: shared MAY NOT import domains or app (Item 1)
  {
    files: ['src/shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        composeRestrictedImports(providerSdk(), sharedNoDomains()),
      ],
    },
  },
  {
    files: [
      'src/domains/**/ui/**/*.{ts,tsx}',
      'src/domains/**/state/**/*.{ts,tsx}',
      'src/domains/**/services/**/*.{ts,tsx}',
      'src/components/**/*.{ts,tsx}',
      'src/shared/**/ui/**/*.{ts,tsx}',
      'src/shared/**/state/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-globals': [
        'error',
        {
          name: 'localStorage',
          message: 'Use browserStorage from @/shared/data/browser-storage instead of localStorage.',
        },
      ],
    },
  },
  {
    files: [
      'src/domains/storyteller/ui/**/*.{ts,tsx}',
      'src/domains/storyteller/state/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-globals': [
        'warn',
        {
          name: 'fetch',
          message:
            'Use domain core/io/*.api.ts helpers (fetchJsonRecord) or TanStack Query — not raw fetch in ui/state.',
        },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/shared/data/url-builder.ts'],
    rules: {
      'no-restricted-globals': [
        'warn',
        {
          name: 'encodeURIComponent',
          message:
            'Use encodePathSegment / buildUrl / appendQueryParams from @/shared/data/url-builder instead of raw encodeURIComponent.',
        },
      ],
    },
  },
  // Gate A2 exemptions. A trailing block, because the provider patterns are
  // merged into several earlier configs and flat config replaces rather than
  // merges — so an `ignores` on any one of them would not cover the rest.
  //
  // The shared/ boundary patterns are restated here: dropping them would turn
  // this exemption into a hole in a different rule.
  {
    files: [...providerSdkExemptions.NEVER_BILLS, ...providerSdkExemptions.SHARED_REMAINDER],
    rules: {
      'no-restricted-imports': ['error', composeRestrictedImports(sharedNoDomains())],
    },
  },
  ...contractsConvertedModules,
  // The fixture proving the contracts gate is on.
  {
    files: ['scripts/gate-fixtures/src/services/reads-untyped-json.ts'],
    rules: { 'local/no-untyped-json-read': 'error' },
  },
  // The fixture proving gate A2 is on. Last, so nothing overrides it.
  {
    files: ['scripts/gate-fixtures/src/services/imports-provider-sdk.ts'],
    rules: {
      'no-restricted-imports': ['error', { paths: PROVIDER_SDK_RESTRICTED_PATHS }],
    },
  },
  {
    files: [
      'src/app/**/*.{ts,tsx}',
      'src/shared/auth/**/*.{ts,tsx}',
      'src/shared/data/api-utils.ts',
      'scripts/gate-fixtures/src/app/api/uses-get-session.ts',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.property.name=\'getSession\']',
          message:
            'Server identity must use getUser() via getUserSession; getSession does not verify the JWT.',
        },
      ],
    },
  },
  // Named remainder of the gateway migration, outside shared/. Each is a real
  // gap rather than a decision, and `providerSdkImportsOutsideGateway` counts
  // them. Per-file compose restates legacy + cross-domain so exempting the
  // provider rule does not open a hole in the boundary rules.
  ...domainRemainderConfigs(providerSdkExemptions.DOMAIN_REMAINDER),
]