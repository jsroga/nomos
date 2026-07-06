const js = require('@eslint/js')
const typescript = require('@typescript-eslint/eslint-plugin')
const typescriptParser = require('@typescript-eslint/parser')
const react = require('eslint-plugin-react')
const reactHooks = require('eslint-plugin-react-hooks')
const reactCompiler = require('eslint-plugin-react-compiler')
const prettier = require('eslint-config-prettier')
const unusedImports = require('eslint-plugin-unused-imports')

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
    },
    rules: {
      ...typescript.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...prettier.rules,
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      // Dead code: use 'error' to fail CI on unused vars (after fixing existing warnings).
      'unused-imports/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
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
    files: ['src/**/*.{ts,tsx}'],
    ignores: [
      'src/domains/**',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/domains/storyteller/*',
                '!@/domains/storyteller/io/*',
              ],
              message:
                'Import from "@/domains/storyteller" instead of storyteller internals. Only io/ is allowed for deep imports.',
            },
            {
              group: [
                '@/domains/interior-designer/*',
                '!@/domains/interior-designer/io/*',
              ],
              message:
                'Import from "@/domains/interior-designer" instead of interior-designer internals. Only io/ is allowed for deep imports.',
            },
            {
              group: ['@/domains/world-building-toolkit/*'],
              message:
                'Import from "@/domains/world-building-toolkit" instead of world-building-toolkit internals.',
            },
            {
              group: ['@/domains/chat/*'],
              message: 'Import from "@/domains/chat" instead of chat internals.',
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
              group: ['@/domains/deduction-puzzle-designer/*'],
              message:
                'Import from "@/domains/deduction-puzzle-designer" instead of deduction-puzzle-designer internals.',
            },
            {
              group: ['@/domains/3d-asset-exporter/*'],
              message:
                'Import from "@/domains/3d-asset-exporter" instead of 3d-asset-exporter internals.',
            },
            {
              group: ['@/domains/game-design/*'],
              message: 'Import from "@/domains/game-design" instead of game-design internals.',
            },
          ],
        },
      ],
    },
  },
  // Boundary rule: domains MAY NOT import legacy root folders (Item 1)
  {
    files: ['src/domains/**/*.{ts,tsx}'],
    rules: {
      // Wave 1 completed - now at ERROR
      'no-restricted-imports': [
        'error',
        {
          patterns: [
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
          ],
        },
      ],
    },
  },
  // Wave 2+ boundary rules — dissolved legacy folders
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
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
          ],
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
]
