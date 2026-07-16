const js = require('@eslint/js')
const typescript = require('@typescript-eslint/eslint-plugin')
const typescriptParser = require('@typescript-eslint/parser')
const react = require('eslint-plugin-react')
const reactHooks = require('eslint-plugin-react-hooks')
const reactCompiler = require('eslint-plugin-react-compiler')
const prettier = require('eslint-config-prettier')
const unusedImports = require('eslint-plugin-unused-imports')
const localRules = require('./eslint-rules')
const codeMetricsLimits = require('./scripts/code-metrics-limits.cjs')

const strictTypeScriptRules = typescript.configs.strict.rules

const DOMAIN_MODULES = [
  'storyteller',
  // chat moved to src/shared/chat (PLAN-V2 3.1 — platform, not a domain)
  'interior-designer',
  'loop-creator',
  'marketing',
  // deduction-puzzle-designer deleted (user-confirmed, PLAN-V2 6.2)
  '3d-asset-exporter',
  'game-design',
  'world-building-toolkit',
]

const DOMAIN_BARREL_GUARD_PATTERNS = [
  {
    group: ['@/domains/storyteller/*', '!@/domains/storyteller/core/io/*'],
    message:
      'Import from "@/domains/storyteller" instead of storyteller internals. Only core/io/ is allowed for deep imports.',
  },
  {
    group: ['@/domains/interior-designer/*', '!@/domains/interior-designer/core/io/*'],
    message:
      'Import from "@/domains/interior-designer" instead of interior-designer internals. Only core/io/ is allowed for deep imports.',
  },
  {
    group: ['@/domains/world-building-toolkit/*'],
    message:
      'Import from "@/domains/world-building-toolkit" instead of world-building-toolkit internals.',
  },
  {
    // chat lives in src/shared/chat now (PLAN-V2 3.1); the old path must not come back
    group: ['@/domains/chat', '@/domains/chat/*'],
    message: 'chat moved to @/shared/chat (platform module) — import from there.',
  },
  {
    group: ['@/domains/loop-creator/*'],
    message: 'Import from "@/domains/loop-creator" instead of loop-creator internals.',
  },
  {
    group: ['@/domains/marketing/*'],
    message: 'Import from "@/domains/marketing" instead of marketing internals.',
  },
  {
    group: ['@/domains/3d-asset-exporter/*'],
    message: 'Import from "@/domains/3d-asset-exporter" instead of 3d-asset-exporter internals.',
  },
  {
    group: ['@/domains/game-design/*'],
    message: 'Import from "@/domains/game-design" instead of game-design internals.',
  },
]

const DOMAIN_LEGACY_RESTRICTED_PATTERNS = [
  {
    group: ['@/lib/*', '@/lib'],
    message: 'Import from "@/shared/data" or "@/shared/auth" instead of @/lib.',
  },
  {
    group: ['@/hooks/*', '@/hooks'],
    message: 'Import from "@/shared/data/queries" or "@/shared/data" instead of root @/hooks.',
  },
  {
    group: ['@/store/*', '@/store'],
    message: 'Import from "@/shared/auth" or "@/shared/errors" instead of root @/store.',
  },
  {
    group: ['@/services/*', '@/services'],
    message: 'Import from "@/shared/data" or domain index instead of root @/services.',
  },
]

const GLOBAL_LEGACY_RESTRICTED_PATTERNS = [
  {
    group: ['@/agent-core/*', '@/agent-core'],
    message: 'Import from "@/shared/agent-kernel" instead of @/agent-core.',
  },
  {
    group: ['@/infrastructure/*', '@/infrastructure'],
    message: 'Import from "@/shared/data" or "@/shared/ai" instead of @/infrastructure.',
  },
  {
    group: ['@/prompts/*', '@/prompts'],
    message: 'Import from "@/shared/agent-kernel/prompts" instead of root @/prompts.',
  },
  {
    group: ['@/lib/*', '@/lib'],
    message: 'Import from "@/shared/data", "@/shared/auth", or "@/shared/tours" instead of @/lib.',
  },
  {
    group: ['@/types/*', '@/types'],
    message: 'Import from "@/shared/types" instead of @/types.',
  },
  {
    group: ['@/config/*', '@/config'],
    message: 'Import from "@/shared/data/constants" instead of @/config.',
  },
  {
    group: ['@/constants/*', '@/constants'],
    message: 'Import from "@/shared/data/constants" instead of @/constants.',
  },
  {
    group: ['@/workflows/*', '@/workflows'],
    message: 'Import from domain agents or "@/shared/agent-kernel/workflows" instead of @/workflows.',
  },
  {
    group: ['@/mastra/*', '@/mastra'],
    message: 'Import from "@/shared/agent-kernel/mastra" instead of @/mastra.',
  },
  {
    group: ['@/evaluation/*', '@/evaluation'],
    message: 'Import from "@/evals" (top-level evals/) instead of @/evaluation.',
  },
]

function crossDomainImportPatterns(currentDomain) {
  return DOMAIN_MODULES.filter(domain => domain !== currentDomain).map(other => ({
    group: [`@/domains/${other}`, `@/domains/${other}/*`],
    message: `Cross-domain import forbidden: use @/shared instead of @/domains/${other}.`,
  }))
}

const domainBoundaryConfigs = DOMAIN_MODULES.map(domain => ({
  files: [`src/domains/${domain}/**/*.{ts,tsx}`],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          ...DOMAIN_LEGACY_RESTRICTED_PATTERNS,
          ...GLOBAL_LEGACY_RESTRICTED_PATTERNS,
          ...crossDomainImportPatterns(domain),
        ],
      },
    ],
  },
}))

module.exports = [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '.cursor/**',
      '.claude/**',
      'playwright-report/**',
      'test-results/**',
      'next-env.d.ts',
      'public/scripts/**/*.min.js',
      'public/scripts/**/*.js',
      '**/*.min.js',
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
    files: ['eslint.config.js', 'scripts/**/*.{mjs,cjs,js}'],
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
    files: ['**/__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}', '**/*.e2e.test.{ts,tsx}'],
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
      'no-restricted-imports': [
        'error',
        {
          patterns: DOMAIN_BARREL_GUARD_PATTERNS,
        },
      ],
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
        {
          patterns: GLOBAL_LEGACY_RESTRICTED_PATTERNS,
        },
      ],
    },
  },
  // Boundary rule: shared MAY NOT import domains or app (Item 1)
  {
    files: ['src/shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/domains/*', '@/domains'],
              message: 'shared/ MAY NOT import domains — dependency inversion required.',
            },
            {
              group: ['@/app/*', '@/app'],
              message: 'shared/ MAY NOT import app routes — dependency inversion required.',
            },
          ],
        },
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
]
